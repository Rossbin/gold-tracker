/**
 * 微信云函数 —— fetchGoldNow
 *
 * 职责：
 *   1. 调度 6 个银行适配器 + 2 个备份源 + 2 个额外参考源并发抓取
 *   2. 银行价格写入 gold_prices 集合；额外数据写入 gold_extra 集合
 *   3. 标记 isStale，维护 succeeded/failed 计数
 *   4. 异动检测：对比本次与上次价格，超过订阅用户阈值则下发订阅消息
 *
 * 触发方式：
 *   - 定时触发器（config.json）：每 5 分钟一次
 *   - 小程序"立即刷新"按钮：callFunction({ name: 'fetchGoldNow' })
 *
 * 订阅消息权限说明：
 *   需在小程序后台「开发管理 → 开发设置 → 订阅消息」申请模板，
 *   并确保云函数所在环境已开通 subscribeMessage.send 权限。
 *   send 的 data 字段名（thing1/amount2 等）需与实际模板一致，按需调整。
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { runAll } = require('./sources/_orchestrator');
const db = cloud.database();
const _ = db.command;

const BANK_NAMES = {
  CMB: '招商银行', ICBC: '工商银行', CCB: '建设银行',
  BOC: '中国银行', ABC: '农业银行', BCM: '交通银行'
};
const ALL_BANKS = ['CMB', 'ICBC', 'CCB', 'BOC', 'ABC', 'BCM'];

exports.main = async (event, context) => {
  const startTime = Date.now();
  console.log('[fetchGoldNow] start', { trigger: event.$trigger || 'manual' });

  // 0. 抓取前先读取各银行"上一次"价格，供异动检测对比
  const prevPrices = await readPrevPrices();

  // 1. 并发抓取所有源
  const { results, succeeded, failed, totalLatencyMs } = await runAll();
  const now = Date.now();
  const STALE_THRESHOLD = 30 * 60 * 1000; // 30 分钟前视为 stale

  // 2. 分类：银行数据进 gold_prices，国际金价/首饰金价进 gold_extra
  const EXTRA_SOURCES = ['gold-api-com', 'jewelry-html', 'tencent-comex'];
  const bankResults = results.filter(r =>
    r.ok && (r.sellPrice || r.midPrice) && !EXTRA_SOURCES.includes(r.source)
  );
  const extraResults = results.filter(r =>
    r.ok && (
      EXTRA_SOURCES.includes(r.source) ||
      (!r.sellPrice && !r.midPrice)
    )
  );

  let written = 0;
  if (bankResults.length > 0) {
    const writeTasks = bankResults.map(r => {
      const doc = {
        bank: r.bank,
        bankName: r.bankName,
        product: r.product,
        buyPrice: r.buyPrice,
        sellPrice: r.sellPrice,
        midPrice: r.midPrice,
        highPrice: r.highPrice,
        lowPrice: r.lowPrice,
        openPrice: r.openPrice,
        change: r.change,
        changePct: r.changePct,
        source: r.source,
        quoteTime: r.quoteTime,
        fetchedAt: r.fetchedAt || now,
        isStale: (r.fetchedAt || now) < (now - STALE_THRESHOLD),
        latencyMs: r.latencyMs,
        createdAt: now
      };
      return db.collection('gold_prices').add({ data: doc }).catch(() => null);
    });
    const writeResults = await Promise.all(writeTasks);
    written = writeResults.filter(Boolean).length;
  }

  // 3. 写入 gold_extra（首饰金价、国际金价等额外数据）
  if (extraResults.length > 0) {
    const extraTasks = extraResults.map(r => {
      return db.collection('gold_extra').add({
        data: {
          type: (r.source.startsWith('gold-api') || r.source === 'tencent-comex') ? 'international' : 'jewelry',
          name: r.bankName || r.name,
          data: r,
          fetchedAt: now,
          createdAt: now
        }
      }).catch(() => null);
    });
    await Promise.all(extraTasks);
  }

  // 4. 异动检测 + 订阅消息推送
  const notifyResult = await checkAndNotify(bankResults, prevPrices);

  // 5. 清理 7 天前历史
  const SEVEN_DAYS_AGO = now - 7 * 24 * 60 * 60 * 1000;
  try {
    await db.collection('gold_prices')
      .where({ fetchedAt: _.lt(SEVEN_DAYS_AGO) })
      .remove();
    await db.collection('gold_extra')
      .where({ fetchedAt: _.lt(SEVEN_DAYS_AGO) })
      .remove();
  } catch (err) {
    console.warn('[fetchGoldNow] cleanup warn:', err.message);
  }

  // 6. 更新 settings
  try {
    await db.collection('gold_settings').doc('global').update({
      data: { lastCronRun: now }
    });
  } catch (_) {}

  const totalMs = Date.now() - startTime;
  console.log(`[fetchGoldNow] done. bank=${bankResults.length} extra=${extraResults.length} written=${written} notified=${notifyResult.notified} totalMs=${totalMs}`);

  return {
    ok: true,
    totalMs,
    fetchLatencyMs: totalLatencyMs,
    sources: results.length,
    succeeded,
    failed,
    written,
    bankData: bankResults,
    extraData: extraResults,
    notify: notifyResult
  };
};

/**
 * 读取各银行当前最新一条价格（即"上次价格"，因为新价格尚未写入）
 */
async function readPrevPrices() {
  const prev = {};
  await Promise.all(ALL_BANKS.map(async (bank) => {
    try {
      const r = await db.collection('gold_prices')
        .where({ bank })
        .orderBy('fetchedAt', 'desc')
        .limit(1)
        .get();
      if (r.data && r.data[0]) prev[bank] = r.data[0];
    } catch (e) {}
  }));
  return prev;
}

/**
 * 异动检测 + 订阅消息下发
 * @param {Array} bankResults 本次抓取的银行数据
 * @param {Object} prevPrices { bank: 上次价格文档 }
 * @returns {{ notified: number, alerts: number, skipped: number }}
 */
async function checkAndNotify(bankResults, prevPrices) {
  const empty = { notified: 0, alerts: 0, skipped: 0 };
  if (!bankResults || !bankResults.length) return empty;

  // 1. 读取所有有效订阅用户（配额 > 0 且开启中）
  let subscribers = [];
  try {
    const r = await db.collection('gold_subscribers')
      .where({ notifyEnabled: true, quota: _.gt(0) })
      .limit(100)
      .get();
    subscribers = r.data || [];
  } catch (e) {
    // gold_subscribers 集合可能尚未创建
    console.warn('[notify] read subscribers failed:', e.message);
    return empty;
  }
  if (!subscribers.length) return empty;

  // 2. 预计算每家银行的波动幅度（绝对值百分比）
  const movements = [];
  for (const r of bankResults) {
    const prev = prevPrices[r.bank];
    if (!prev || !prev.sellPrice || !r.sellPrice) continue;
    const pct = (r.sellPrice - prev.sellPrice) / prev.sellPrice * 100;
    movements.push({
      bank: r.bank,
      bankName: r.bankName || BANK_NAMES[r.bank] || r.bank,
      sellPrice: r.sellPrice,
      pct,
      absPct: Math.abs(pct)
    });
  }

  let notified = 0;
  let alerts = 0;
  let skipped = 0;

  // 3. 逐个订阅用户，按其阈值筛选异动并推送
  for (const sub of subscribers) {
    const threshold = sub.threshold || 1;
    const hits = movements.filter(m => m.absPct >= threshold);

    if (!hits.length) { skipped++; continue; }
    alerts += hits.length;

    // 取波动最大的一家作为消息主体
    hits.sort((a, b) => b.absPct - a.absPct);
    const top = hits[0];
    const banksText = hits.slice(0, 3).map(h => h.bankName).join('、');

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    try {
      // ⚠️ data 字段名需与小程序后台申请的订阅消息模板一致，按实际模板调整
      await cloud.openapi.subscribeMessage.send({
        touser: sub.openid,
        templateId: sub.tmplId,
        page: 'pages/index/index',
        miniprogramState: 'formal',
        data: {
          thing1: { value: `${banksText}金价异动` },
          amount2: { value: `${Number(top.sellPrice).toFixed(2)}元/克` },
          character_string3: { value: `${top.pct >= 0 ? '+' : ''}${top.pct.toFixed(2)}%` },
          time4: { value: timeStr }
        }
      });

      // 推送成功：配额 -1
      try {
        await db.collection('gold_subscribers').doc(sub._id).update({
          data: { quota: _.inc(-1), lastNotifiedAt: Date.now() }
        });
      } catch (e) {}
      notified++;
    } catch (err) {
      console.warn('[notify] send failed:', sub.openid, err.errMsg || err.message);
      // 用户已拒收 / 取消订阅授权(43101)，标记关闭避免反复尝试
      if (err.errCode === 43101 || /refused|deny|cancel/i.test(err.errMsg || '')) {
        try {
          await db.collection('gold_subscribers').doc(sub._id).update({
            data: { notifyEnabled: false, updatedAt: Date.now() }
          });
        } catch (e) {}
      }
    }
  }

  console.log(`[notify] subscribers=${subscribers.length} notified=${notified} alerts=${alerts} skipped=${skipped}`);
  return { notified, alerts, skipped };
}
