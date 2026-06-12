/**
 * 东方财富 —— 黄金实时报价（最稳定的 Au99.99 基准源）
 *
 * 数据源：push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999
 */

const BaseSource = require('./_base');
const { fetch, parseJSONP } = require('./_http');

class EastMoneySource extends BaseSource {
  constructor() {
    super({
      name: 'EAST',
      displayName: '东方财富',
      type: 'backup',
      timeout: 5000
    });
    this.url = 'https://push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999&fields=f43,f44,f45,f46,f60,f169,f170,f50,f167&cb=jQuery_cb';
  }

  async fetchOne() {
    const body = await fetch(this.url, { timeout: this.timeout });
    const data = parseJSONP(body);

    if (!data || !data.data) throw new Error('eastmoney: no data');
    const d = data.data;
    const price = d.f43 / 100;
    const lastClose = d.f60 / 100;
    const change = d.f169 / 100;

    if (!price || price < 100) throw new Error('eastmoney: invalid price ' + price);

    return {
      product: 'Au99.99',
      buyPrice: lastClose,
      sellPrice: price,
      midPrice: (price + lastClose) / 2,
      highPrice: d.f44 / 100,
      lowPrice: d.f45 / 100,
      openPrice: d.f46 / 100,
      change,
      changePct: d.f170 / 100,
      source: 'eastmoney-jsonp',
      quoteTime: new Date().toISOString(),
      raw: { f43: d.f43, f44: d.f44, f45: d.f45, f46: d.f46, f60: d.f60, f169: d.f169, f170: d.f170 }
    };
  }
}

module.exports = EastMoneySource;
