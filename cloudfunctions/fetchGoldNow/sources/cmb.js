/**
 * 招商银行 —— 黄金积存 / 金生利
 *
 * 数据源：m.cmbchina.com/api/rate/gold
 * 优点：原生 JSON API，无反爬，可直接 GET
 */

const BaseSource = require('./_base');

// 在云函数环境中，全局没有 window/document；用 module.exports 暴露一个可切换的 HTTP 客户端
function getHttp() {
  // 云函数中用 require('request-promise')；本地测试用 require('axios') 或 fetch
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class CMBSource extends BaseSource {
  constructor() {
    super({
      name: 'CMB',
      displayName: '招商银行',
      type: 'bank',
      timeout: 4000
    });
    this.url = 'https://m.cmbchina.com/api/rate/gold';
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client available');

    let body;
    if (http.default) {
      // axios
      const r = await http.get(this.url, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
      });
      body = r.data;
    } else {
      // request-promise
      body = await http({
        url: this.url,
        method: 'GET',
        timeout: this.timeout,
        json: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
      });
    }

    // 招行返回结构：{ body: { time, data: [{ variety, curPrice, upDown, high, low, open, lastClose }, ...] } }
    if (!body || !body.body || !Array.isArray(body.body.data)) {
      throw new Error('unexpected response structure');
    }
    // 优先取积存金 Au99.99；找不到则取第一条
    const item = body.body.data.find(d => /au99\.99|积存|金生利/i.test(d.variety)) || body.body.data[0];
    if (!item) throw new Error('no gold item in response');

    const sell = parseFloat(item.curPrice);
    const change = parseFloat(item.upDown);
    const preClose = parseFloat(item.preClose);
    const lastClose = preClose;  // 招行字段是 preClose（昨收）
    const mid = lastClose ? (sell + lastClose) / 2 : sell;

    return {
      product: item.variety || 'Au99.99',
      buyPrice: lastClose || null,    // 招行"昨收"近似买入价
      sellPrice: sell,
      midPrice: mid,
      change: change,
      changePct: lastClose ? (change / lastClose) * 100 : null,
      source: 'cmb-api',
      quoteTime: body.body.time || new Date().toISOString(),
      raw: item
    };
  }
}

module.exports = CMBSource;
