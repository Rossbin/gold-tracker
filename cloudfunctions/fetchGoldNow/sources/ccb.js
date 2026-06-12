/**
 * 建设银行 —— Au9999 黄金积存（基于东方财富代理 + 经验点差）
 *
 * 建行 gold.ccb.com/cn/gold/quotationGold.html 页面改版后，
 * 原有的正则在 HTML 里匹配不到 Au9999 价格。
 *
 * 改用东方财富 Au99.99 实时价 + 经验点差作为代理。
 */

const EastMoneyProxyBase = require('./_eastProxyBase');

class CCBSource extends EastMoneyProxyBase {
  constructor() {
    super({ bankCode: 'CCB' });
  }
}

module.exports = CCBSource;
