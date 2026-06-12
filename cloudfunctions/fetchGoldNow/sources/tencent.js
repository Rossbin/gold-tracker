/**
 * 腾讯财经 —— 国际金价（COMEX 黄金）参考
 *
 * 数据源：https://qt.gtimg.cn/q=hf_GC
 * 单位：美元/盎司，需换算成人民币/克
 *
 * ⚠️ 注意：这是**国际金价**（COMEX 黄金期货），不是国内银行积存金报价
 * 适用于：
 *   - 跨市场对照
 *   - 涨跌参考
 *   不适用于：作为国内银行积存金的报价展示
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class TencentSource extends BaseSource {
  constructor() {
    super({
      name: 'TENCENT',
      displayName: 'COMEX 国际金价',
      type: 'reference',     // 不计入价格展示
      timeout: 5000
    });
    this.url = 'https://qt.gtimg.cn/q=hf_GC,s_GoldAu99.99';
  }

  parseQStr(str) {
    // var hq_str_hf_GC="4211.08,2.36,4213.00,..."
    // 字段：当前价,涨跌额,买入,卖出,最高,最低,时间,...
    const m = str.match(/="([^"]+)"/);
    if (!m) return null;
    const parts = m[1].split(',');
    return {
      price: parseFloat(parts[0]),
      change: parseFloat(parts[1]),
      bid: parseFloat(parts[2]),
      ask: parseFloat(parts[3]),
      high: parseFloat(parts[4]),
      low: parseFloat(parts[5]),
      time: parts[6]
    };
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    let body;
    if (http.default) {
      const r = await http.get(this.url, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        responseType: 'text'
      });
      body = r.data;
    } else {
      body = await http({
        url: this.url,
        method: 'GET',
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
    }

    // 优先取 s_GoldAu99.99（上海金交所 Au99.99 人民币/克）
    let sge = null, comex = null;
    if (typeof body === 'string') {
      const sgeMatch = body.match(/v_s_GoldAu99\.99="([^"]+)"/);
      const comexMatch = body.match(/v_hf_GC="([^"]+)"/);
      if (sgeMatch) sge = this.parseQStr('="' + sgeMatch[1] + '"');
      if (comexMatch) comex = this.parseQStr('="' + comexMatch[1] + '"');
    }

    // 用 sge Au99.99 优先；否则 comex 黄金（需要做汇率换算）
    let price, lastClose, change;
    if (sge && sge.price) {
      price = sge.price;
      lastClose = sge.price - (sge.change || 0);
      change = sge.change;
    } else if (comex && comex.price) {
      // COMEX 是美元/盎司，转人民币/克：price * 7.2(汇率) / 31.1035(oz to g)
      const cnyPerGram = comex.price * 7.2 / 31.1035;
      price = cnyPerGram;
      lastClose = cnyPerGram - (comex.change || 0) * 7.2 / 31.1035;
      change = comex.change * 7.2 / 31.1035;
    } else {
      throw new Error('tencent: no usable quote');
    }

    return {
      product: sge ? 'Au99.99' : 'COMEX→Au',
      buyPrice: lastClose,
      sellPrice: price,
      midPrice: (price + lastClose) / 2,
      change,
      changePct: lastClose ? (change / lastClose) * 100 : null,
      source: sge ? 'tencent-sge' : 'tencent-comex',
      quoteTime: (sge && sge.time) || (comex && comex.time) || new Date().toISOString(),
      raw: { sge, comex }
    };
  }
}

module.exports = TencentSource;
