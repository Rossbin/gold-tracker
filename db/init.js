/**
 * 数据库初始化脚本 —— 在云函数 fetchGoldNow 第一次执行时调用
 *
 * 微信云开发的 db.createCollection 必须在云函数/控制台内执行
 * 此文件在 _orchestrator 启动时自动调用一次
 */

const cloud = require('wx-server-sdk');

async function ensureCollections(db) {
  const expected = ['gold_prices', 'gold_settings'];

  for (const name of expected) {
    try {
      await db.createCollection(name);
      console.log(`[db.init] created collection: ${name}`);
    } catch (err) {
      // 已存在时抛错属于正常
      if (!/already|exists/i.test(err.message || err.errMsg || '')) {
        console.warn(`[db.init] createCollection ${name} warn:`, err.message);
      }
    }
  }

  // 写入默认 settings 文档
  try {
    await db.collection('gold_settings').doc('global').get();
  } catch (err) {
    await db.collection('gold_settings').add({
      data: {
        _id: 'global',
        refreshInterval: 60,
        notifyEnabled: false,
        createdAt: Date.now()
      }
    });
  }
}

module.exports = { ensureCollections };
