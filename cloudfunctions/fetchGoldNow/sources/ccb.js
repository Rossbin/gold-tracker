/**
 * 建设银行 —— 账户金/黄金积存
 *
 * 数据源：gold.ccb.com/cn/gold/quotationGold.html （服务端渲染 HTML）
 * 策略：用 cheerio 解析表格，提取 Au9999/Au9995 等品种
 *
 * 注意：这是建行的"账户金"报价，不是"个人黄金积存主动积存价"。
 * 积存价通常 ≈ 账户金卖出价 + 0.5~2 元/克（手工加价）。
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class CCBSource extends BaseSource {
  constructor() {
    super({
      name: 'CCB',
      displayName: '建设银行',
      type: 'bank',
      timeout: 6000
    });
    this.url = 'https://gold.ccb.com/cn/gold/quotationGold.html';
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    let html;
    if (http.default) {
      const r = await http.get(this.url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://gold.ccb.com/'
        }
      });
      html = r.data;
    } else {
      html = await http({
        url: this.url,
        method: 'GET',
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://gold.ccb.com/'
        }
      });
    }

    // 解析 HTML —— 优先 cheerio，fallback 正则
    let price = null, change = null;
    try {
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);
      // 建行表格一般有 Au9999 / Au9995 行，按品种列匹配
      $('tr').each((_, tr) => {
        const tds = $(tr).find('td');
        const txt = tds.map((_, td) => $(td).text().trim()).get().join('|');
        if (/Au9999|AU9999|9999/i.test(txt) && !price) {
          // 期望列：品种 | 买入价 | 卖出价 | 最高 | 最低 | 涨跌 | 时间
          const nums = txt.match(/[-+]?\d+\.\d{2,3}/g) || [];
          if (nums.length >= 2) {
            price = parseFloat(nums[1]);   // 第二列通常是卖出价
            change = parseFloat(nums[5] || nums[3] || 0);
          }
        }
      });
    } catch (e) {
      // cheerio 不可用时正则兜底
      const m = html.match(/Au9999[^<>]{0,200}<\/td>\s*<td[^>]*>([\d.]+)/i)
            || html.match(/<td[^>]*>([\d.]+)<\/td>\s*<td[^>]*>([\d.]+)<\/td>/);
      if (m) price = parseFloat(m[2] || m[1]);
    }

    if (!price) throw new Error('ccb: Au9999 price not found in page');
    const lastClose = price - (change || 0);
    return {
      product: 'Au9999',
      buyPrice: lastClose,
      sellPrice: price,
      midPrice: (price + lastClose) / 2,
      change: change || 0,
      changePct: lastClose ? ((change || 0) / lastClose) * 100 : null,
      source: 'ccb-html',
      quoteTime: new Date().toISOString(),
      raw: { parsed: 'cheerio or regex' }
    };
  }
}

module.exports = CCBSource;
