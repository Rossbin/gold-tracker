/**
 * 腾讯财经 —— 国际金价（COMEX 黄金）参考
 *
 * 数据源：https://qt.gtimg.cn/q=hf_GC,s_GoldAu99.99
 * 单位：美元/盎司（COMEX）、元/克（SGE Au99.99）
 *
 * 本适配器同时取 COMEX 黄金期货和上海金交所 Au99.99 现货，
 * 用 COMEX 价作为国际金价，用 SGE 价反推实时汇率，换算出人民币/克展示。
 */

const BaseSource = require('./_base');
const { fetch } = require('./_http');

const OZ_TO_GRAM = 31.1035;
const DEFAULT_FX = 7.20;

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
      price: parseFloat(parts[0]),     // 最新价
      change: parseFloat(parts[1]),  // 涨跌额
      bid: parseFloat(parts[2]),
      ask: parseFloat(parts[3]),
      high: parseFloat(parts[4]),    // 最高价
      low: parseFloat(parts[5]),     // 最低价
      time: parts[6]                 // 行情时间
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

    if (!comex || !comex.price) {
      throw new Error('tencent: no usable COMEX quote');
    }

    // 用 SGE 人民币/克 和 COMEX 美元/盎司 反推实时汇率
    let fxRate = DEFAULT_FX;
    if (sge && sge.price) {
      fxRate = (sge.price * OZ_TO_GRAM) / comex.price;
    }
    fxRate = parseFloat(fxRate.toFixed(4));

    // 人民币/克 = USD/oz ÷ 31.1035 × 汇率
    const priceCNY_g = (comex.price / OZ_TO_GRAM) * fxRate;
    const lastCloseUSD = comex.price - (comex.change || 0);
    const lastCloseCNY_g = (lastCloseUSD / OZ_TO_GRAM) * fxRate;
    const changeCNY_g = priceCNY_g - lastCloseCNY_g;

    return {
      product: 'COMEX 黄金',
      buyPrice: parseFloat(lastCloseCNY_g.toFixed(2)),
      sellPrice: parseFloat(priceCNY_g.toFixed(2)),
      midPrice: parseFloat(((priceCNY_g + lastCloseCNY_g) / 2).toFixed(2)),
      highPrice: parseFloat(((comex.high || comex.price) / OZ_TO_GRAM * fxRate).toFixed(2)),
      lowPrice: parseFloat(((comex.low || comex.price) / OZ_TO_GRAM * fxRate).toFixed(2)),
      change: parseFloat(changeCNY_g.toFixed(2)),
      changePct: parseFloat(((changeCNY_g / lastCloseCNY_g) * 100).toFixed(2)),
      source: 'tencent-comex',
      quoteTime: comex.time || new Date().toISOString(),
      raw: {
        priceUSD_oz: comex.price,
        fxRate,
        priceCNY_g: parseFloat(priceCNY_g.toFixed(2)),
        highUSD_oz: comex.high || null,
        lowUSD_oz: comex.low || null,
        changeUSD_oz: comex.change || 0,
        sge,
        comex
      }
    };
  }
}

module.exports = TencentSource;
