/**
 * 国际金价 —— gold-api.com (免费，无需 KEY)
 *
 * 数据源：https://api.gold-api.com/price/XAU
 * 返回：XAU/USD 实时现货价（美元/盎司）
 *
 * 用于换算成"人民币/克"：
 *   1 盎司(oz) = 31.1035 克
 *   USD/CNY 汇率从东财获取
 *   CNY/g = USD/oz ÷ 31.1035 × USD_CNY_rate
 *
 * 注意：免费 API 无频率保证，生产环境建议申请 goldapi.io 或 metals-api.com 的免费 KEY。
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class GoldAPIIntlSource extends BaseSource {
  constructor() {
    super({
      name: 'INTL',
      displayName: '国际金价',
      type: 'international',
      timeout: 6000
    });
    this.url = 'https://api.gold-api.com/price/XAU';
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    // 并发拿：金价 + 美元/人民币汇率
    const [priceRes, fxRes] = await Promise.allSettled([
      http.default
        ? http.get(this.url, { timeout: this.timeout, headers: { 'User-Agent': 'Mozilla/5.0' } })
        : http({ url: this.url, method: 'GET', timeout: this.timeout, headers: { 'User-Agent': 'Mozilla/5.0' } }),
      // 东财实时美元/人民币汇率（USD/CNY）
      this._fetchUSD_CNY(http)
    ]);

    let body;
    if (priceRes.status === 'rejected') {
      throw new Error('gold-api.com: ' + (priceRes.reason?.message || priceRes.reason));
    }
    body = priceRes.value.data || priceRes.value;

    // 解析 gold-api.com 响应
    const priceUSD = parseFloat(body.price); // USD/oz
    const quoteTime = body.updatedAt;
    if (!priceUSD || isNaN(priceUSD)) throw new Error('gold-api.com: invalid price');

    // 获取 USD/CNY
    let fxRate = 7.25; // 默认值（粗略）
    if (fxRes.status === 'fulfilled') {
      const fxData = fxRes.value.data || fxRes.value;
      if (fxData && fxData.f43) {
        fxRate = fxData.f43 / 100; // 东财 f43 是 ×100
      }
    }

    // 换算：USD/oz → CNY/g
    const ozToGram = 31.1035;
    const priceCNY_g = (priceUSD / ozToGram) * fxRate;
    const lastCloseUSD = priceUSD - (body.change || 0);
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
      quoteTime,
      raw: {
        priceUSD_oz: priceUSD,
        fxRate,
        priceCNY_g: parseFloat(priceCNY_g.toFixed(2))
      }
    };
  }

  async _fetchUSD_CNY(http) {
    const url = 'https://push2.eastmoney.com/api/qt/stock/get?secid=106.USDCNY&fields=f43,f44,f45,f46,f60,f169,f170&cb=jQuery_cb';
    try {
      const resp = await (http.default
        ? http.get(url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } })
        : http({ url, method: 'GET', timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      );
      let body = resp.data || resp;
      if (typeof body === 'string') {
        const m = body.match(/jQuery_cb\((.*)\)/s);
        if (m) body = JSON.parse(m[1]);
      }
      return resp;
    } catch (e) {
      return { status: 'rejected', reason: e };
    }
  }
}

module.exports = GoldAPIIntlSource;
