/**
 * 东方财富共享基类 —— 给所有"银行代理源"使用
 *
 * 6 家银行（工/建/中/农/交）自家接口都不稳定，
 * 但**东方财富 Au99.99 实时报价**在云函数里稳定可用（已验证）。
 *
 * 各银行金条/积存金价 ≈ 东方财富 Au99.99 + 点差
 * 点差：手工经验值，反映银行"买入价 = SGE 价"+"卖出价 = SGE 价 + 利润"
 *
 * 招行单独走原接口（已经稳定可通），本基类不包含它。
 */

const EastMoneySource = require('./eastmoney');

// 各家银行经验点差（元/克）—— 可后续根据银行实际报价微调
const BANK_SPREADS = {
  ICBC: { bankName: '工商银行', buy: -0.5, sell: 1.2, note: '工行' },
  CCB:  { bankName: '建设银行', buy: -0.3, sell: 0.8, note: '建行' },
  BOC:  { bankName: '中国银行', buy: 0.0,  sell: 1.5, note: '中行' },
  ABC:  { bankName: '农业银行', buy: -0.8, sell: 1.0, note: '农行' },
  BCM:  { bankName: '交通银行', buy: -0.2, sell: 1.8, note: '交行' }
};

class EastMoneyProxyBase extends EastMoneySource {
  constructor(opts) {
    super();
    this.bankCode = opts.bankCode;
    this.bankName = BANK_SPREADS[opts.bankCode].bankName;
    this.spreadBuy = BANK_SPREADS[opts.bankCode].buy;
    this.spreadSell = BANK_SPREADS[opts.bankCode].sell;
    this.name = opts.bankCode;
    this.displayName = this.bankName;
    this.type = 'bank';
  }

  /**
   * 先调东财拿到基准价，再加各家点差
   * 如果东财本身失败，这里会直接抛错（让上层知道"代理源依赖的基础设施挂了"）
   */
  async fetchOne() {
    const baseResult = await super.fetchOne();
    if (!baseResult.sellPrice) throw new Error('eastmoney proxy: base price unavailable');

    const sell = baseResult.sellPrice + this.spreadSell;
    const buy = baseResult.sellPrice + this.spreadBuy;  // 用最新价 + 点差作为买价
    const lastClose = baseResult.buyPrice + this.spreadBuy;
    const change = sell - lastClose;

    return {
      product: 'Au99.99',
      buyPrice: parseFloat(buy.toFixed(2)),
      sellPrice: parseFloat(sell.toFixed(2)),
      midPrice: parseFloat(((sell + buy) / 2).toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePct: lastClose ? parseFloat(((change / lastClose) * 100).toFixed(2)) : null,
      source: `eastmoney-proxy-${this.bankCode.toLowerCase()}`,
      quoteTime: baseResult.quoteTime,
      raw: {
        eastmoney: baseResult.raw,
        spread: { buy: this.spreadBuy, sell: this.spreadSell },
        note: '基于东方财富 Au99.99 实时价 + 经验点差估算，非银行实际成交价'
      }
    };
  }
}

module.exports = EastMoneyProxyBase;
module.exports.BANK_SPREADS = BANK_SPREADS;
