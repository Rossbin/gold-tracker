/**
 * 微信云函数 —— fetchGoldNow
 *
 * 职责：
 *   1. 调度 6 个银行适配器 + 2 个备份源 + 2 个额外参考源并发抓取
 *   2. 银行价格写入 gold_prices 集合；额外数据写入 gold_extra 集合
 *   3. 标记 isStale，维护 succeeded/failed 计数
 *
 * 触发方式：
 *   - 定时触发器（config.json）：每 5 分钟一次
 *   - 小程序"立即刷新"按钮：callFunction({ name: 'fetchGoldNow' })
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { runAll, getAllExtraSources } = require('./sources/_orchestrator');
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const startTime = Date.now();
  console.log('[fetchGoldNow] start', { trigger: event.$trigger || 'manual' });

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

  // 4. 清理 7 天前历史
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

  // 5. 更新 settings
  try {
    await db.collection('gold_settings').doc('global').update({
      data: { lastCronRun: now }
    });
  } catch (_) {}

  const totalMs = Date.now() - startTime;
  console.log(`[fetchGoldNow] done. bank=${bankResults.length} extra=${extraResults.length} written=${written} totalMs=${totalMs}`);

  return {
    ok: true,
    totalMs,
    fetchLatencyMs: totalLatencyMs,
    sources: results.length,
    succeeded,
    failed,
    written,
    bankData: bankResults,
    extraData: extraResults
  };
};
