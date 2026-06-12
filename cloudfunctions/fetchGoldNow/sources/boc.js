/**
 * 中国银行 —— Au99.99 黄金宝（基于东方财富代理 + 经验点差）
 *
 * 中行无公开实时金价 JSON API，仅 ebank.boc.cn 登录态页面有数据。
 *
 * 改用东方财富 Au99.99 实时价 + 经验点差作为代理。
 */

const EastMoneyProxyBase = require('./_eastProxyBase');

class BOCSource extends EastMoneyProxyBase {
  constructor() {
    super({ bankCode: 'BOC' });
  }
}

module.exports = BOCSource;
