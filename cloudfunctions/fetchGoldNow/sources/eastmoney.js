/**
 * 东方财富 —— 黄金实时报价
 *
 * 数据源：push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999
 * secid 编码：上海金交所品种 = 118. 前缀
 * 返回：JSONP（jQuery 回调），需截取括号内
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class EastMoneySource extends BaseSource {
  constructor() {
    super({
      name: 'EAST',
      displayName: '东方财富',
      type: 'backup',
      timeout: 5000
    });
    this.url = 'https://push2.eastmoney.com/api/qt/stock/get';
    this.secid = '118.AU9999';
    this.fields = 'f43,f44,f45,f46,f60,f169,f170,f171,f168,f50,f167,f117';
    // f43=最新价×100, f44=最高×100, f45=最低×100, f46=今开×100, f60=昨收×100, f169=涨跌额×100, f170=涨跌幅%
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    const url = `${this.url}?secid=${this.secid}&fields=${this.fields}&cb=jQuery_cb`;

    let body;
    if (http.default) {
      const r = await http.get(url, { timeout: this.timeout, headers: { 'User-Agent': 'Mozilla/5.0' } });
      body = r.data;
    } else {
      body = await http({
        url,
        method: 'GET',
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
    }

    // 截取 jQuery_cb({...})
    if (typeof body === 'string') {
      const m = body.match(/jQuery_cb\((.*)\)/s) || body.match(/^[^(]*\((.*)\)$/s);
      if (m) {
        try { body = JSON.parse(m[1]); } catch (e) {}
      }
    }

    if (!body || !body.data) throw new Error('eastmoney: no data');
    const d = body.data;
    const price = d.f43 / 100;
    const lastClose = d.f60 / 100;
    const change = d.f169 / 100;
    if (!price) throw new Error('eastmoney: price is 0');

    return {
      product: 'Au99.99',
      buyPrice: lastClose,
      sellPrice: price,
      midPrice: (price + lastClose) / 2,
      change,
      changePct: d.f170 / 100,    // f170 已经是百分比
      source: 'eastmoney-jsonp',
      quoteTime: new Date().toISOString(),
      raw: d
    };
  }
}

module.exports = EastMoneySource;
