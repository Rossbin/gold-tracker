/**
 * 腾讯财经 —— 国际金价（COMEX 黄金）参考
 *
 * 数据源：https://qt.gtimg.cn/q=hf_GC
 * 单位：美元/盎司
 */

const BaseSource = require('./_base');
const { fetch } = require('./_http');

class TencentSource extends BaseSource {
  constructor() {
    super({
      name: 'TENCENT',
      displayName: 'COMEX 国际金价',
      type: 'reference',
      timeout: 5000
    });
    this.url = 'https://qt.gtimg.cn/q=hf_GC,s_GoldAu99.99';
  }

  parseQStr(str) {
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
    const body = await fetch(this.url, { timeout: this.timeout });

    let sge = null, comex = null;
    if (typeof body === 'string') {
      const sgeMatch = body.match(/v_s_GoldAu99\.99="([^"]+)"/);
      const comexMatch = body.match(/v_hf_GC="([^"]+)"/);
      if (sgeMatch) sge = this.parseQStr('="' + sgeMatch[1] + '"');
      if (comexMatch) comex = this.parseQStr('="' + comexMatch[1] + '"');
    }

    let price, lastClose, change;
    if (sge && sge.price) {
      price = sge.price;
      lastClose = sge.price - (sge.change || 0);
      change = sge.change;
    } else if (comex && comex.price) {
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
