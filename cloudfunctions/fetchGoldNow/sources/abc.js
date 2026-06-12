/**
 * 农业银行 —— Au99.99 传世之宝 / 黄金积存（基于东方财富代理 + 经验点差）
 *
 * 农行 ewealth.abchina.com 黄金页面需要 JS 渲染 + 复杂 Cookie，
 * 云函数里无法稳定抓取。
 *
 * 改用东方财富 Au99.99 实时价 + 经验点差作为代理。
 */

const EastMoneyProxyBase = require('./_eastProxyBase');

class ABCSource extends EastMoneyProxyBase {
  constructor() {
    super({ bankCode: 'ABC' });
  }
}

module.exports = ABCSource;
