/**
 * 上海黄金交易所 —— Au99.99 基准价（取日 K 线最后一条 = 最近一个交易日收盘价）
 *
 * 数据源：https://www.sge.com.cn/graph/Dailyhq (POST)
 * 交易时段：工作日 9:00-11:30, 13:30-15:30, 20:00-次日 02:30
 * 非交易时段返回最近一个收盘价。
 *
 * 注意：SGE 官方未提供"秒级实时价"公开接口。本接口返回**最近一个交易日的收盘价**，
 * 作为整个系统的"基准价"，供工/建/中/农/交 + 点差代理使用。
 *
 * 如果此接口超时/失败，会被 SgeProxyAdapter 兜底为东方财富实时价。
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class SGESource extends BaseSource {
  constructor() {
    super({
      name: 'SGE',
      displayName: '上海黄金交易所',
      type: 'backup',
      timeout: 6000
    });
    this.url = 'https://www.sge.com.cn/graph/Dailyhq';
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.sge.com.cn/',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    const form = 'instid=Au99.99';

    let body;
    if (http.default) {
      const r = await http.post(this.url, form, { timeout: this.timeout, headers });
      body = r.data;
    } else {
      body = await http({
        url: this.url,
        method: 'POST',
        form,
        timeout: this.timeout,
        headers,
        json: false
      });
    }

    // 期望响应：{ time: [['2026-06-12', '910.30', '912.50', '905.10', '909.85'], ...] }
    // 最后一根 K 线 = 最近一个交易日的收盘价
    let price, lastClose, change, quoteTime, lastDate;
    if (body && Array.isArray(body.time) && body.time.length) {
      const last = body.time[body.time.length - 1];
      // last = [date, open, high, low, close]
      lastDate = last[0];
      price = parseFloat(last[4]);
      const prev = body.time.length >= 2 ? body.time[body.time.length - 2] : null;
      lastClose = prev ? parseFloat(prev[4]) : parseFloat(last[1]);
      change = price - lastClose;
      quoteTime = `${last[0]}T15:30:00+08:00`;
    } else if (body && body.data && body.data.length) {
      // 兼容另一种结构
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
