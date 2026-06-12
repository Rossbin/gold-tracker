/**
 * 首饰金价抓取器 —— 多源兜底
 *
 * 优先级：
 *  1. precious.smm.cn（上海有色金属网）—— 最新数据，今日更新
 *     包含：周大福、周生生、老凤祥、六福珠宝、老庙黄金、菜百首饰、中国黄金、潮宏基、谢瑞麟 等
 *     注意：此站使用 Next.js SSR + 客户端 JS 渲染，curl 拿不到数据。
 *     部署到云函数后可用 puppeteer 或直接解析 HTML。
 *
 *  2. jinrijinjia.cn —— 静态 HTML，可抓取，数据可能滞后 1-3 天
 *
 * 抓取方式：cheerio 解析 HTML 表格或正则提取
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class JewelrySource extends BaseSource {
  constructor() {
    super({
      name: 'JEWELRY',
      displayName: '首饰金价',
      type: 'jewelry',
      timeout: 8000
    });
    // 按优先级排列
    this.urls = [
      { url: 'https://www.jinrijinjia.cn/hjjg/9500.html', label: 'jinrijinjia', encoding: 'utf-8' }
    ];
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    let brands = [];
    let errMsg = '';

    for (const src of this.urls) {
      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        };
        const resp = await (http.default
          ? http.get(src.url, { timeout: 6000, headers })
          : http({ url: src.url, method: 'GET', timeout: 6000, headers })
        );
        const html = (resp.data || resp);
        if (typeof html !== 'string' || html.length < 100) continue;

        const decoded = src.encoding === 'gbk'
          ? Buffer.from(html, 'binary').toString('utf-8')
          : html;

        brands = this._parseJinri(decoded);
        if (brands.length > 0) break;
      } catch (e) {
        errMsg += `${src.url}: ${e.message}; `;
      }
    }

    if (brands.length === 0) {
      throw new Error('jewelry: all sources failed. ' + errMsg);
    }

    // 取有代表性的品牌
    const FEATURED = ['周大福', '周生生', '老凤祥', '六福珠宝', '老庙黄金', '中国黄金'];
    const featured = {};
    for (const b of brands) {
      if (FEATURED.includes(b.brand)) {
        featured[b.brand] = b;
      }
    }

    return {
      product: '首饰金价',
      bank: 'JEWELRY',
      bankName: '首饰金价',
      brands: brands.slice(0, 15),
      featured,
      source: 'jewelry-html',
      quoteTime: brands[0]?.updatedAt || new Date().toISOString(),
      raw: { count: brands.length, sample: brands.slice(0, 3) }
    };
  }

  _parseJinri(html) {
    const brands = [];
    const BRAND_MAP = {
      '周大福': '周大福', '老凤祥': '老凤祥', '周生生': '周生生',
      '六福': '六福珠宝', '老庙黄金': '老庙黄金', '老庙': '老庙黄金',
      '菜百': '菜百首饰', '菜百首饰': '菜百首饰',
      '中国黄金': '中国黄金', '潮宏基': '潮宏基',
      '谢瑞麟': '谢瑞麟', '周六福': '周六福', '周大生': '周大生',
      '金至尊': '金至尊', '宝庆': '宝庆银楼',
      '水贝': '深圳水贝'
    };

    // 方法1：找 <tr>...</tr> 表格行
    const TR_PAT = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    let currentBrand = null;
    let currentProduct = null;

    while ((match = TR_PAT.exec(html)) !== null) {
      const row = match[1];
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const texts = cells.map(c => c.replace(/<[^>]+>/g, '').trim());

      for (const t of texts) {
        // 匹配品牌
        for (const [pattern, canonical] of Object.entries(BRAND_MAP)) {
          if (t.includes(pattern) || t === pattern) {
            currentBrand = canonical;
            currentProduct = null;
            break;
          }
        }
        // 匹配产品类型
        if (currentBrand && (t.includes('黄金') || t.includes('金价') || t.includes('饰品'))) {
          if (t.includes('999')) currentProduct = '足金999';
          else if (t.includes('投资')) currentProduct = '投资金条';
          else currentProduct = '黄金';
        }
        // 匹配价格
      let updateDate = null;
      const dateMatch = t.match(/(\d{4}-\d{1,2}-\d{1,2})/);
      if (dateMatch) {
        updateDate = `${dateMatch[1]}T00:00:00+08:00`;
      }
      const priceM = t.match(/(\d{3,4})\s*元\s*[/／]?\s*克/);
      if (priceM && currentBrand) {
        brands.push({
          brand: currentBrand,
          product: currentProduct || '黄金',
          price: parseInt(priceM[1]),
          unit: '元/克',
          updatedAt: updateDate || new Date().toISOString()
        });
      }
      }
    }

    // 方法2：正则直接搜索
    if (brands.length === 0) {
      const BRAND_PATTERNS = [
        /周大福[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
        /老凤祥[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
        /周生生[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
        /六福珠?宝?[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
        /老庙黄金[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
        /中国黄金[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
        /潮宏基[^\d\n<>]{0,50}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      ];
      for (const pat of BRAND_PATTERNS) {
        const name = pat.source.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').slice(0, 5);
        let m;
        while ((m = pat.exec(html)) !== null) {
          brands.push({
            brand: name.replace(/[^\u4e00-\u9fa5]/g, '') || name,
            product: '黄金',
            price: parseInt(m[1]),
            unit: '元/克',
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // 去重：同品牌只保留第一个（最贵的通常是首饰金价）
    const seen = new Set();
    return brands.filter(b => {
      if (seen.has(b.brand)) return false;
      seen.add(b.brand);
      return b.price > 500 && b.price < 2000; // 合理金价范围
    });
  }
}

module.exports = JewelrySource;
