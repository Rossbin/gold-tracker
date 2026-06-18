/**
 * 微信云函数 —— updateSettings
 *
 * 职责：
 *   1. 修改全局设置：refreshInterval / notifyThreshold / notifyEnabled
 *      （持久化到 gold_settings 的 global 文档）
 *   2. 管理订阅用户（gold_subscribers 集合）：
 *      - subscribeAction='add'   : 注册订阅并配额 +1
 *      - subscribeAction='query' : 只查询当前用户配额
 *      - unsubscribe=true        : 移除该用户订阅
 *
 * 关于刷新频率：
 *   微信云开发定时触发器是静态部署的，无法在运行时重写另一个云函数的触发器。
 *   因此 refreshInterval 仅影响前端轮询节奏，后端定时器保持默认 5 分钟兜底。
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ALLOWED_INTERVALS = [10, 30, 60, 120, 300, 600];
// 新版阈值：降价金额（元/克）。旧版百分比数据已迁移兼容。
const ALLOWED_THRESHOLDS = [5, 10, 20, 30];

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const {
    refreshInterval,
    notifyEnabled,
    notifyThreshold,
    subscribeAction,
    tmplId,
    unsubscribe
  } = event || {};

  // ---- 1. 全局设置校验 ----
  if (refreshInterval != null && !ALLOWED_INTERVALS.includes(refreshInterval)) {
    return { ok: false, error: `refreshInterval must be one of ${ALLOWED_INTERVALS.join(',')}` };
  }
  if (notifyThreshold != null && !ALLOWED_THRESHOLDS.includes(notifyThreshold)) {
    return { ok: false, error: `notifyThreshold must be one of ${ALLOWED_THRESHOLDS.join(',')}` };
  }

  const settingsResult = { updatedAt: Date.now() };
  if (refreshInterval != null) settingsResult.refreshInterval = refreshInterval;
  if (notifyThreshold != null) settingsResult.notifyThreshold = notifyThreshold;
  if (notifyEnabled != null) settingsResult.notifyEnabled = !!notifyEnabled;

  // ---- 2. 持久化全局设置（upsert global 文档）----
  try {
    if (Object.keys(settingsResult).length > 1) {
      await db.collection('gold_settings').doc('global').update({ data: settingsResult });
    }
  } catch (err) {
    // 文档不存在则创建
    try {
      await db.collection('gold_settings').add({
        data: {
          _id: 'global',
          refreshInterval: refreshInterval || 60,
          notifyThreshold: notifyThreshold || 1,
          notifyEnabled: !!notifyEnabled,
          createdAt: Date.now(),
          ...settingsResult
        }
      });
    } catch (e) {}
  }

  // ---- 3. 订阅用户管理 ----
  let quota = 0;
  let subscriber = null;

  if (OPENID) {
    // 读取当前订阅记录
    try {
      const r = await db.collection('gold_subscribers').doc(OPENID).get();
      subscriber = r.data;
      quota = subscriber ? (subscriber.quota || 0) : 0;
    } catch (e) {
      // 文档不存在，尚未订阅
      subscriber = null;
      quota = 0;
    }

    // 注册/续订：配额 +1
    if (subscribeAction === 'add') {
      const now = Date.now();
      if (subscriber) {
        await db.collection('gold_subscribers').doc(OPENID).update({
          data: {
            quota: _.inc(1),
            tmplId: tmplId || subscriber.tmplId,
            threshold: notifyThreshold != null ? notifyThreshold : subscriber.threshold,
            notifyEnabled: true,
            updatedAt: now
          }
        });
        quota += 1;
      } else {
        await db.collection('gold_subscribers').add({
          data: {
            _id: OPENID,
            openid: OPENID,
            tmplId: tmplId || '',
            threshold: notifyThreshold != null ? notifyThreshold : 1,
            notifyEnabled: true,
            quota: 1,
            createdAt: now,
            updatedAt: now
          }
        });
        quota = 1;
      }
    }

    // 仅查询：返回当前配额
    if (subscribeAction === 'query') {
      // 不修改，仅返回 quota
    }

    // 取消订阅：移除记录（或标记关闭）
    if (unsubscribe) {
      try {
        if (subscriber) {
          await db.collection('gold_subscribers').doc(OPENID).update({
            data: { notifyEnabled: false, quota: 0, updatedAt: Date.now() }
          });
        }
      } catch (e) {}
      quota = 0;
    }

    // 阈值变更同步到个人订阅记录
    // （覆盖设置页单独改阈值、保存设置等无 subscribeAction 的场景；
    //   add 分支已在上面写入 threshold，query 为纯读不写入，故都排除）
    if (notifyThreshold != null && !unsubscribe &&
        subscribeAction !== 'add' && subscribeAction !== 'query' && subscriber) {
      try {
        await db.collection('gold_subscribers').doc(OPENID).update({
          data: { threshold: notifyThreshold, updatedAt: Date.now() }
        });
      } catch (e) {}
    }
  }

  return {
    ok: true,
    settings: {
      ...settingsResult,
      quota,
      openid: OPENID || null
    }
  };
};
