/**
 * 工商银行积存金
 *
 * 策略：
 *   1. 优先请求 106.54.190.155:886 代理接口获取工行真实主动积存价格
 *   2. 并发请求东方财富 AU9999 获取 high/low/open/change 完整行情
 *   3. 若代理接口失败，回退到纯东财代理
 */

const BaseSource = require('./_base');
const { fetch, parseJSONP } = require('./_http');

class ICBCSource extends BaseSource {
  constructor() {
    super({
      name: 'ICBC',
      displayName: '工商银行',
      type: 'bank',
      timeout: 8000
    });
    this.icbcUrl = 'http://106.54.190.155:886/get_latest_price.php?_=1781256293098';
    this.eastUrl = 'https://push2.eastmoney.com/api/qt/stock/get?secid=118.AU9999&fields=f43,f44,f45,f46,f60,f169,f170&cb=jQuery_cb';
  }

  async fetchOne() {
    // 并发：工行真实价格 + 东财完整行情
    const [icbcRes, eastRes] = await Promise.allSettled([
      fetch(this.icbcUrl, {
        timeout: 6000,
        headers: { 'User-Agent': 'curl/7.68.0', 'Accept': '*/*' }
      }),
      fetch(this.eastUrl, { timeout: 4000 })
    ]);

    // 解析工行价格
    let icbcPrice = null, icbcTime = null;
    if (icbcRes.status === 'fulfilled') {
      const json = parseJSONP(icbcRes.value);
      // 如果返回的是 HTML 错误页面，json 可能是字符串
      if (json && typeof json === 'object' && json.success && json.price) {
        icbcPrice = parseFloat(json.price);
        icbcTime = json.datetime;
      }
    }

    // 解析东财行情（必须有，用于补 high/low/change）
    let eastData = null;
    if (eastRes.status === 'fulfilled') {
      const json = parseJSONP(eastRes.value);
      if (json && json.data) {
        const d = json.data;
        eastData = {
          price: d.f43 / 100,
          high: d.f44 / 100,
          low: d.f45 / 100,
          open: d.f46 / 100,
          lastClose: d.f60 / 100,
          change: d.f169 / 100,
          changePct: d.f170 / 100
        };
      }
    }

    if (!eastData) {
      throw new Error('icbc: eastmoney fetch failed');
    }

    // 如果工行代理失败，回退到东财代理 + 1.2 价差
    const useProxy = icbcPrice && !isNaN(icbcPrice);
    const sellPrice = useProxy ? icbcPrice : eastData.price + 1.2;
    const buyPrice = useProxy ? sellPrice - 0.5 : eastData.lastClose;

    return {
      product: '积存金 Au99.99',
      buyPrice: parseFloat(buyPrice.toFixed(2)),
      sellPrice: parseFloat(sellPrice.toFixed(2)),
      midPrice: parseFloat(((buyPrice + sellPrice) / 2).toFixed(2)),
      highPrice: eastData.high,
      lowPrice: eastData.low,
      openPrice: eastData.open,
      change: eastData.change,
      changePct: eastData.changePct,
      source: useProxy ? 'icbc-proxy+east' : 'icbc-eastproxy',
      quoteTime: icbcTime || new Date().toISOString(),
      raw: { icbcPrice, eastData, useProxy }
    };
  }
}

module.exports = ICBCSource;
