/**
 * 微信云函数 —— getLatestPrice
 *
 * 职责：
 *   - 从 gold_prices 读取每家银行最新的一条价格（主卡片）
 *   - 从 gold_extra 读取首饰金价和国际金价（额外参考）
 * 调用方：小程序首页（轮询拉取）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const BANK_ORDER = ['CMB', 'ICBC', 'CCB', 'BOC', 'ABC', 'BCM'];
const BANK_NAMES = {
  CMB:  '招商银行',
  ICBC: '工商银行',
  CCB:  '建设银行',
  BOC:  '中国银行',
  ABC:  '农业银行',
  BCM:  '交通银行'
};

exports.main = async (event, context) => {
  const now = Date.now();
  const STALE = 30 * 60 * 1000;

  // 1. 主卡片：各银行最新价格
  const bankTasks = BANK_ORDER.map(async (bank) => {
    try {
      const r = await db.collection('gold_prices')
        .where({ bank })
        .orderBy('fetchedAt', 'desc')
        .limit(1)
        .get();
      const doc = r.data[0];
      if (!doc) return null;
      return {
        bank,
        bankName: BANK_NAMES[bank] || doc.bankName,
        product: doc.product,
        buyPrice: doc.buyPrice,
        sellPrice: doc.sellPrice,
        midPrice: doc.midPrice,
        change: doc.change,
        changePct: doc.changePct,
        source: doc.source,
        quoteTime: doc.quoteTime,
        fetchedAt: doc.fetchedAt,
        isStale: doc.fetchedAt < (now - STALE)
      };
    } catch (err) {
      return null;
    }
  });

  // 2. 额外参考：首饰金价 + 国际金价
  const extraTask = (async () => {
    try {
      const r = await db.collection('gold_extra')
        .orderBy('fetchedAt', 'desc')
        .limit(5)
        .get();
      return r.data || [];
    } catch (_) {
      return [];
    }
  })();

  const [bankList, extraList] = await Promise.all([
    Promise.all(bankTasks).then(ts => ts.filter(Boolean)),
    extraTask
  ]);

  // 3. 把国际金价和首饰金价分开
  const international = extraList.filter(d => d.type === 'international')[0];
  const jewelry = extraList.filter(d => d.type === 'jewelry')[0];

  return {
    ok: true,
    serverTime: now,
    bankData: bankList,
    international,
    jewelry
  };
};
