/**
 * 招商银行 —— 黄金积存 / 金生利
 * 唯一有公开 JSON API 的银行
 */

const BaseSource = require('./_base');
const { fetch, parseJSONP } = require('./_http');

class CMBSource extends BaseSource {
  constructor() {
    super({
      name: 'CMB',
      displayName: '招商银行',
      type: 'bank',
      timeout: 5000
    });
    this.url = 'https://m.cmbchina.com/api/rate/gold';
  }

  async fetchOne() {
    const body = await fetch(this.url, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Referer': 'https://m.cmbchina.com/'
      }
    });

    let json = typeof body === 'string' ? parseJSONP(body) : body;
    if (!json || !json.body || !Array.isArray(json.body.data)) {
      throw new Error('cmb: unexpected response structure');
    }

    const item = json.body.data.find(d => /au99\.99|积存|金生利/i.test(d.variety)) || json.body.data[0];
    if (!item) throw new Error('cmb: no gold item');

    const sell = parseFloat(item.curPrice);
    const change = parseFloat(item.upDown);
    const preClose = parseFloat(item.preClose || item.lastClose || 0);
    const high = parseFloat(item.high || 0);
    const low = parseFloat(item.low || 0);
    const open = parseFloat(item.open || 0);
    const mid = preClose ? (sell + preClose) / 2 : sell;

    return {
      product: item.variety || 'Au99.99',
      buyPrice: preClose || null,
      sellPrice: sell,
      midPrice: mid,
      highPrice: high || null,
      lowPrice: low || null,
      openPrice: open || null,
      change,
      changePct: preClose ? (change / preClose) * 100 : null,
      source: 'cmb-api',
      quoteTime: json.body.time || new Date().toISOString(),
      raw: item
    };
  }
}

module.exports = CMBSource;
