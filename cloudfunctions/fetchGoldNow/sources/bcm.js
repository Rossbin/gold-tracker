/**
 * 交通银行 —— Au99.99 沃德金（基于东方财富代理 + 经验点差）
 *
 * 交行 m.bankcomm.com 贵金属页面需要登录态 + 动态 token + 加密参数，
 * 云函数里无法稳定抓取。
 *
 * 改用东方财富 Au99.99 实时价 + 经验点差作为代理。
 */

const EastMoneyProxyBase = require('./_eastProxyBase');

class BCMSource extends EastMoneyProxyBase {
  constructor() {
    super({ bankCode: 'BCM' });
  }
}

module.exports = BCMSource;
