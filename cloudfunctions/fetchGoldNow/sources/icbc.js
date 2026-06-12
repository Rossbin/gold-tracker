/**
 * 工商银行 —— Au99.99 积存金（基于东方财富代理 + 经验点差）
 *
 * 工行 servlet 接口 https://mybank.icbc.com.cn/servlet/AsynGetDataServlet
 * 加了动态加密参数（基于 5+ 年前的反编译数据），现行版本已失效。
 *
 * 改用东方财富 Au99.99 实时价 + 经验点差作为代理。
 */

const EastMoneyProxyBase = require('./_eastProxyBase');

class ICBCSource extends EastMoneyProxyBase {
  constructor() {
    super({ bankCode: 'ICBC' });
  }
}

module.exports = ICBCSource;
