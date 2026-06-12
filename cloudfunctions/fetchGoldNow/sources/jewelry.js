/**
 * 首饰金价 —— 从 jinrijinjia.cn 抓取
 *
 * 静态 HTML 页面，包含多个品牌金店的今日金价
 * 解析表格中的品牌名和价格
 */

const BaseSource = require('./_base');
const { fetch } = require('./_http');

class JewelrySource extends BaseSource {
  constructor() {
    super({
      name: 'JEWELRY',
      displayName: '首饰金价',
      type: 'jewelry',
      timeout: 8000
    });
  }

  async fetchOne() {
    const url = 'https://www.jinrijinjia.cn/hjjg/9500.html';
    const html = await fetch(url, {
      timeout: 7000,
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' }
    });

    if (!html || html.length < 200) {
      throw new Error('jewelry: empty response');
    }

    const brands = this._parseHTML(html);
    if (brands.length === 0) {
      throw new Error('jewelry: no brands parsed from ' + url);
    }

    // 精选品牌
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

  _parseHTML(html) {
    const brands = [];

    // 品牌映射表
    const BRAND_MAP = {
      '周大福': '周大福', '老凤祥': '老凤祥', '周生生': '周生生',
      '六福': '六福珠宝', '六福珠宝': '六福珠宝',
      '老庙黄金': '老庙黄金', '老庙': '老庙黄金',
      '菜百': '菜百首饰', '菜百首饰': '菜百首饰',
      '中国黄金': '中国黄金', '潮宏基': '潮宏基',
      '谢瑞麟': '谢瑞麟', '周六福': '周六福', '周大生': '周大生',
      '金至尊': '金至尊', '宝庆': '宝庆银楼',
      '老铺黄金': '老铺黄金', '梦金园': '梦金园',
      '周大福(内地)': '周大福', '周大福(香港)': '周大福(香港)'
    };

    // 匹配品牌 + 价格
    const PATTERNS = [
      /周大福[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /老凤祥[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /周生生[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /六福珠?宝?[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /老庙黄金[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /中国黄金[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /潮宏基[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
      /菜百[^\d]?[\s\S]{0,30}(\d{3,4})\s*元\s*[/／]?\s*克/g,
    ];

    const seen = new Set();

    for (const pat of PATTERNS) {
      const brandName = pat.source.match(/^([^\d]+)/)?.[1] || '';
      let match;
      while ((match = pat.exec(html)) !== null) {
        const price = parseInt(match[1]);
        if (price > 500 && price < 2000) {
          // 提取品牌名
          let canonicalBrand = brandName.replace(/[^\u4e00-\u9fa5]/g, '');
          canonicalBrand = BRAND_MAP[canonicalBrand] || canonicalBrand;

          if (!seen.has(canonicalBrand)) {
            seen.add(canonicalBrand);
            brands.push({
              brand: canonicalBrand,
              product: '足金999',
              price,
              unit: '元/克',
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    // 表格解析兜底
    if (brands.length === 0) {
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      let currentBrand = null;

      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        for (const cell of cells) {
          const text = cell.replace(/<[^>]+>/g, '').trim();

          // 找品牌
          for (const [pattern, canonical] of Object.entries(BRAND_MAP)) {
            if (text.includes(pattern)) {
              currentBrand = canonical;
              break;
            }
          }

          // 找价格
          const priceM = text.match(/(\d{3,4})\s*元\s*[/／]?\s*克/);
          if (priceM && currentBrand && !seen.has(currentBrand)) {
            const price = parseInt(priceM[1]);
            if (price > 500 && price < 2000) {
              seen.add(currentBrand);
              brands.push({
                brand: currentBrand,
                product: '足金999',
                price,
                unit: '元/克',
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    return brands;
  }
}

module.exports = JewelrySource;
