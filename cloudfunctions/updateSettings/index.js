/**
 * 微信云函数 —— updateSettings
 *
 * 职责：
 *   1. 修改刷新频率等用户设置
 *   2. 在云函数端动态重写 fetchGoldNow 的 config.json（定时触发器）
 *
 * ⚠️ 注意：微信云开发定时触发器是**静态部署**的（上传时确定 cron），
 * 严格意义上本云函数无法直接重写另一个云函数的触发器。
 *
 * 实际方案：
 *   - 小程序前端用 setInterval 自行控制轮询节奏
 *   - 后端定时器保持默认 5 分钟（兜底用）
 *   - 用户在设置页改的 refreshInterval 只影响前端轮询
 *
 * 本云函数只负责：把用户的设置持久化到 gold_settings 集合
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ALLOWED_INTERVALS = [10, 30, 60, 120, 300, 600];

exports.main = async (event, context) => {
  const { refreshInterval, notifyEnabled } = event || {};

  if (refreshInterval != null && !ALLOWED_INTERVALS.includes(refreshInterval)) {
    return { ok: false, error: `refreshInterval must be one of ${ALLOWED_INTERVALS.join(',')}` };
  }

  const update = { updatedAt: Date.now() };
  if (refreshInterval != null) update.refreshInterval = refreshInterval;
  if (notifyEnabled != null) update.notifyEnabled = !!notifyEnabled;

  try {
    await db.collection('gold_settings').doc('global').update({ data: update });
  } catch (err) {
    // 文档不存在则创建
    await db.collection('gold_settings').add({
      data: { _id: 'global', ...update, refreshInterval: refreshInterval || 60, notifyEnabled: !!notifyEnabled }
    });
  }

  return { ok: true, settings: update };
};
