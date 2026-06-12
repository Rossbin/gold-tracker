/**
 * 国际金价 —— gold-api.com (免费，无需 KEY)
 *
 * 数据源：https://api.gold-api.com/price/XAU
 * 返回：XAU/USD 实时现货价（美元/盎司）
 *
 * 换算：CNY/g = USD/oz ÷ 31.1035 × USD_CNY_rate
 */

const BaseSource = require('./_base');
const { fetch, parseJSONP } = require('./_http');

class GoldAPIIntlSource extends BaseSource {
  constructor() {
    super({
      name: 'INTL',
      displayName: '国际金价',
      type: 'international',
      timeout: 6000
    });
  }

  async fetchOne() {
    // 并发请求：金价 + 汇率
    const [priceBody, fxBody] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU', { timeout: 5000 }),
      this._fetchFX()
    ]);

    // 解析金价
    let priceJSON;
    try {
      priceJSON = parseJSONP(priceBody);
    } catch (e) {
      throw new Error('gold-api: failed to parse response');
    }

    const priceUSD = parseFloat(priceJSON?.price);
    if (!priceUSD || isNaN(priceUSD) || priceUSD < 500) {
      throw new Error('gold-api: invalid price ' + priceJSON?.price);
    }

    // 解析汇率（默认 7.25）
    let fxRate = 7.25;
    try {
      const fxJSON = parseJSONP(fxBody);
      if (fxJSON?.data?.f43) {
        fxRate = fxJSON.data.f43 / 100;
      }
    } catch (e) {}

    // 换算：USD/oz → CNY/g
    const ozToGram = 31.1035;
    const priceCNY_g = (priceUSD / ozToGram) * fxRate;
    const changeUSD = parseFloat(priceJSON?.change || 0);
    const lastCloseUSD = priceUSD - changeUSD;
    const lastCloseCNY_g = (lastCloseUSD / ozToGram) * fxRate;
    const changeCNY_g = priceCNY_g - lastCloseCNY_g;

    return {
      product: 'XAU/USD',
      buyPrice: parseFloat(lastCloseCNY_g.toFixed(2)),
      sellPrice: parseFloat(priceCNY_g.toFixed(2)),
      midPrice: parseFloat(((priceCNY_g + lastCloseCNY_g) / 2).toFixed(2)),
      change: parseFloat(changeCNY_g.toFixed(2)),
      changePct: parseFloat(((changeCNY_g / lastCloseCNY_g) * 100).toFixed(2)),
      source: 'gold-api-com',
      quoteTime: priceJSON?.updatedAt || new Date().toISOString(),
      raw: {
        priceUSD_oz: priceUSD,
        fxRate,
        priceCNY_g: parseFloat(priceCNY_g.toFixed(2))
      }
    };
  }

  async _fetchFX() {
    // 东财美元/人民币汇率
    const url = 'https://push2.eastmoney.com/api/qt/stock/get?secid=106.USDCNY&fields=f43&cb=jQuery_cb';
    return fetch(url, { timeout: 3000 });
  }
}

module.exports = GoldAPIIntlSource;
