/**
 * 交通银行 —— 沃德金 / 黄金积存
 *
 * 实际情况：交行 m.bankcomm.com 沃德金页需登录态，无公开 JSON API。
 * 策略：代理 SGE Au99.99 + 经验点差。
 */

const BaseSource = require('./_base');
const sgeModule = require('./sge');

const BCM_SPREAD_SELL = 12.0;
const BCM_SPREAD_BUY = 8.0;

class BCMSource extends BaseSource {
  constructor() {
    super({
      name: 'BCM',
      displayName: '交通银行',
      type: 'bank',
      timeout: 5000
    });
    this._sge = new sgeModule();
  }

  async fetchOne() {
    const sgePromise = this._sge.fetch();
    const timeoutPromise = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('BCM: SGE proxy timeout')), 8000)
    );
    const r = await Promise.race([sgePromise, timeoutPromise]);
    if (!r.ok || !r.sellPrice) throw new Error('SGE not available for BCM proxy');

    return {
      product: '沃德金 Au99.99',
      buyPrice: r.midPrice ? r.midPrice + BCM_SPREAD_BUY : r.sellPrice + BCM_SPREAD_BUY,
      sellPrice: r.sellPrice + BCM_SPREAD_SELL,
      midPrice: r.sellPrice + (BCM_SPREAD_SELL + BCM_SPREAD_BUY) / 2,
      change: r.change,
      changePct: r.changePct,
      source: 'sge-proxy-bcm',
      quoteTime: r.quoteTime,
      raw: { sge: r, spread: { sell: BCM_SPREAD_SELL, buy: BCM_SPREAD_BUY } }
    };
  }
}

module.exports = BCMSource;
