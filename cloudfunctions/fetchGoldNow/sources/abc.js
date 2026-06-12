/**
 * 农业银行 —— 传世之宝 / 黄金积存
 *
 * 实际情况：农行"传世之宝"积存金价格仅在 ewealth.abchina.com 登录后或手机银行内展示，
 * 未发现公开 JSON 报价接口。
 * 策略：与中行一致，代理 SGE Au99.99 + 经验点差。
 */

const BaseSource = require('./_base');
const sgeModule = require('./sge');

const ABC_SPREAD_SELL = 10.0;
const ABC_SPREAD_BUY = 6.0;

class ABCSource extends BaseSource {
  constructor() {
    super({
      name: 'ABC',
      displayName: '农业银行',
      type: 'bank',
      timeout: 5000
    });
    this._sge = new sgeModule();
  }

  async fetchOne() {
    const sgePromise = this._sge.fetch();
    const timeoutPromise = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('ABC: SGE proxy timeout')), 8000)
    );
    const r = await Promise.race([sgePromise, timeoutPromise]);
    if (!r.ok || !r.sellPrice) throw new Error('SGE not available for ABC proxy');

    return {
      product: '传世之宝 Au99.99',
      buyPrice: r.midPrice ? r.midPrice + ABC_SPREAD_BUY : r.sellPrice + ABC_SPREAD_BUY,
      sellPrice: r.sellPrice + ABC_SPREAD_SELL,
      midPrice: r.sellPrice + (ABC_SPREAD_SELL + ABC_SPREAD_BUY) / 2,
      change: r.change,
      changePct: r.changePct,
      source: 'sge-proxy-abc',
      quoteTime: r.quoteTime,
      raw: { sge: r, spread: { sell: ABC_SPREAD_SELL, buy: ABC_SPREAD_BUY } }
    };
  }
}

module.exports = ABCSource;
