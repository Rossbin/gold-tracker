/**
 * 微信云函数 —— getLatestPrice
 *
 * 职责：从 gold_prices 集合读取每家银行最新的一条价格
 * 调用方：小程序首页（轮询拉取）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const BANK_ORDER = ['ICBC', 'CCB', 'ABC', 'BOC', 'BCM', 'CMB'];
const BANK_NAMES = {
  ICBC: '工商银行',
  CCB: '建设银行',
  ABC: '农业银行',
  BOC: '中国银行',
  BCM: '交通银行',
  CMB: '招商银行'
};

exports.main = async (event, context) => {
  const now = Date.now();
  const STALE = 30 * 60 * 1000;

  // 对每家银行取最新一条
  const tasks = BANK_ORDER.map(async (bank) => {
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
      console.warn(`[getLatestPrice] ${bank} error:`, err.message);
      return null;
    }
  });

  const list = (await Promise.all(tasks)).filter(Boolean);
  return { ok: true, list, serverTime: now };
};
