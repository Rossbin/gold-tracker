/**
 * 中国银行 —— "黄金宝" / 个人黄金积存
 *
 * 实际情况：中行无公开 JSON API，ebank.boc.cn 的价格需登录态。
 * 策略：直接代理 SGE Au99.99 价格 + 经验点差（中行积存金卖出价通常 = SGE + 8~15 元/克）。
 * 把代理点差写进 source 字段，标记清楚来源。
 *
 * 如果需要精确"中行黄金宝"价，必须走登录态或用 Selenium；本系统不实现。
 */

const BaseSource = require('./_base');
const sgeModule = require('./sge');

// 中行积存金相对 SGE Au99.99 的经验点差（元/克，卖出价相对 SGE 即时价的溢价）
const BOC_SPREAD_SELL = 11.0;   // 中行积存金卖出 ≈ SGE + 11
const BOC_SPREAD_BUY = 7.0;     // 银行买入 ≈ SGE + 7

class BOCSource extends BaseSource {
  constructor() {
    super({
      name: 'BOC',
      displayName: '中国银行',
      type: 'bank',
      timeout: 5000
    });
    this._sge = new sgeModule();
  }

  async fetchOne() {
    // 给 SGE 留 6s 预算（包含 HTTP + JSON 解析）
    const sgePromise = this._sge.fetch();
    const timeoutPromise = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('BOC: SGE proxy timeout')), 8000)
    );
    const r = await Promise.race([sgePromise, timeoutPromise]);
    if (!r.ok || !r.sellPrice) throw new Error('SGE not available for BOC proxy');

    return {
      product: 'Au99.99 积存金',
      buyPrice: r.midPrice ? r.midPrice + BOC_SPREAD_BUY : r.sellPrice + BOC_SPREAD_BUY,
      sellPrice: r.sellPrice + BOC_SPREAD_SELL,
      midPrice: r.sellPrice + (BOC_SPREAD_SELL + BOC_SPREAD_BUY) / 2,
      change: r.change,
      changePct: r.changePct,
      source: 'sge-proxy-boc',
      quoteTime: r.quoteTime,
      raw: { sge: r, spread: { sell: BOC_SPREAD_SELL, buy: BOC_SPREAD_BUY } }
    };
  }
}

module.exports = BOCSource;
