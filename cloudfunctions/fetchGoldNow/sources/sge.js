/**
 * 上海黄金交易所 —— Au99.99 基准价（日 K 线最后一条 = 最近交易日收盘价）
 *
 * 数据源：https://www.sge.com.cn/graph/Dailyhq (POST)
 * 注意：SGE 官方无秒级实时价公开接口，返回最近交易日收盘价
 */

const BaseSource = require('./_base');

// 使用原生 https 发送 POST
function postJSON(url, formData, timeout = 6000) {
  const https = require('https');
  const { URL } = require('url');
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = Buffer.from(formData, 'utf8');
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.sge.com.cn/',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.setTimeout(timeout);
    req.write(data);
    req.end();
  });
}

class SGESource extends BaseSource {
  constructor() {
    super({
      name: 'SGE',
      displayName: '上海黄金交易所',
      type: 'backup',
      timeout: 8000
    });
    this.url = 'https://www.sge.com.cn/graph/Dailyhq';
  }

  async fetchOne() {
    const body = await postJSON(this.url, 'instid=Au99.99', this.timeout);

    let price, lastClose, change, quoteTime, lastDate;
    if (body && Array.isArray(body.time) && body.time.length) {
      const last = body.time[body.time.length - 1];
      lastDate = last[0];
      price = parseFloat(last[4]);
      const prev = body.time.length >= 2 ? body.time[body.time.length - 2] : null;
      lastClose = prev ? parseFloat(prev[4]) : parseFloat(last[1]);
      change = price - lastClose;
      quoteTime = `${last[0]}T15:30:00+08:00`;
    } else if (body && body.data && body.data.length) {
      const last = body.data[body.data.length - 1];
      lastDate = last.date || last[0];
      price = parseFloat(last.close || last[4]);
      lastClose = parseFloat(last.open || last[1] || price);
      change = price - lastClose;
      quoteTime = new Date().toISOString();
    } else {
      throw new Error('SGE: unexpected response ' + JSON.stringify(body).slice(0, 200));
    }

    if (!price || isNaN(price)) throw new Error('SGE: invalid price');
    return {
      product: 'Au99.99',
      buyPrice: lastClose,
      sellPrice: price,
      midPrice: (price + lastClose) / 2,
      change,
      changePct: lastClose ? (change / lastClose) * 100 : null,
      source: 'sge-official',
      quoteTime,
      lastTradeDate: lastDate
    };
  }
}

module.exports = SGESource;
