/**
 * 工商银行积存金 —— 东方财富代理
 *
 * 工行没有公开 API，使用东财 Au99.99 报价 + 经验价差
 * 价差：卖出价 = 东财价 + 1.2 元/克
 */

const BaseSource = require('./_base');
const { fetch, parseJSONP } = require('./_http');

class ICBCSource extends BaseSource {
  constructor() {
    super({
      name: 'ICBC',
      displayName: '工商银行',
      type: 'bank',
      timeout: 5000
    });
    this.eastUrl = 'https://push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999&fields=f43,f60,f169,f170&cb=jQuery_cb';
    this.SPREAD = 1.2; // 元/克
  }

  async fetchOne() {
    const body = await fetch(this.eastUrl, { timeout: this.timeout });
    const data = parseJSONP(body);

    if (!data || !data.data) throw new Error('icbc: eastmoney fetch failed');
    const d = data.data;
    const eastPrice = d.f43 / 100;    // 东财最新价
    const lastClose = d.f60 / 100;   // 昨收价
    const change = d.f169 / 100;     // 涨跌额

    if (!eastPrice || eastPrice < 100) throw new Error('icbc: invalid eastmoney price');

    // 工行报价策略：买入=东财昨收，卖出=东财今价+溢价
    const buyPrice = lastClose;
    const sellPrice = eastPrice + this.SPREAD;
    const midPrice = (buyPrice + sellPrice) / 2;

    return {
      product: '积存金 Au99.99',
      buyPrice,
      sellPrice: parseFloat(sellPrice.toFixed(2)),
      midPrice: parseFloat(midPrice.toFixed(2)),
      change: change,
      changePct: d.f170 / 100,
      source: 'icbc-eastproxy',
      quoteTime: new Date().toISOString(),
      raw: { eastPrice, lastClose, change, spread: this.SPREAD }
    };
  }
}

module.exports = ICBCSource;
