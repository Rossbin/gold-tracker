/**
 * 微信云函数 —— fetchGoldNow
 *
 * 职责：
 *   1. 调度 6 个银行适配器 + 3 个备份源并发抓取
 *   2. 标准化数据，写入云数据库 gold_prices 集合
 *   3. 标记 isStale、维护 succeeded/failed 计数
 *
 * 触发方式：
 *   - 定时触发器（config.json）：每 5 分钟一次
 *   - 小程序"立即刷新"按钮：callFunction({ name: 'fetchGoldNow' })
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { runAll } = require('./sources/_orchestrator');
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const startTime = Date.now();
  console.log('[fetchGoldNow] start', { trigger: event.$trigger || 'manual' });

  // 1. 并发抓取
  const { results, succeeded, failed, totalLatencyMs } = await runAll();

  // 2. 写库
  const now = Date.now();
  const STALE_THRESHOLD = 30 * 60 * 1000;  // 30 分钟前视为 stale
  const writeTasks = [];
  let written = 0;

  for (const r of results) {
    if (r.ok && r.sellPrice) {
      const doc = {
        bank: r.bank,
        bankName: r.bankName,
        product: r.product,
        buyPrice: r.buyPrice,
        sellPrice: r.sellPrice,
        midPrice: r.midPrice,
        change: r.change,
        changePct: r.changePct,
        source: r.source,
        quoteTime: r.quoteTime,
        fetchedAt: r.fetchedAt,
        isStale: r.fetchedAt < (now - STALE_THRESHOLD),
        latencyMs: r.latencyMs,
        createdAt: now
      };
      writeTasks.push(db.collection('gold_prices').add({ data: doc }).catch(err => ({
        err: err.message
      })));
    }
  }

  const writeResults = await Promise.all(writeTasks);
  written = writeResults.filter(r => !r || !r.err).length;

  // 3. 清理 7 天前历史（避免数据库超 2GB 限额）
  const SEVEN_DAYS_AGO = now - 7 * 24 * 60 * 60 * 1000;
  try {
    await db.collection('gold_prices')
      .where({ fetchedAt: _.lt(SEVEN_DAYS_AGO) })
      .remove();
  } catch (err) {
    console.warn('[fetchGoldNow] cleanup old data failed:', err.message);
  }

  // 4. 更新 settings.lastCronRun
  try {
    await db.collection('gold_settings').doc('global').update({
      data: { lastCronRun: now }
    });
  } catch (err) {
    // 首次可能 doc 不存在，忽略
  }

  const totalMs = Date.now() - startTime;
  console.log(`[fetchGoldNow] done. sources=${results.length} ok=${succeeded} fail=${failed} written=${written} totalMs=${totalMs}`);

  return {
    ok: true,
    totalMs,
    fetchLatencyMs: totalLatencyMs,
    sources: results.length,
    succeeded,
    failed,
    written,
    data: results
  };
};
