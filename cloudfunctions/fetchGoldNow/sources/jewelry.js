/**
 * 首饰金价 —— 使用 tmini.net 免费聚合 API
 *
 * 数据源：https://tmini.net/api/gold-price?type=json
 * 返回字段：
 *   - stores: 品牌金店饰品金价列表（周大福、老凤祥等）
 *   - metals: 国际/国内贵金属行情
 *   - banks: 银行投资金条价格
 *
 * 相比原 jinrijinjia.cn HTML 抓取，该 API 响应更快、更稳定，
 * 且避免了部分网络环境下 TLS 握手失败的问题。
 */

const BaseSource = require('./_base');
const { fetch } = require('./_http');

// 首页优先展示的品牌
const FEATURED = ['周大福', '周生生', '老凤祥', '六福珠宝', '老庙黄金', '中国黄金'];

// 需要从 stores 列表中排除的非品牌汇总项
const EXCLUDE_KEYWORDS = [
  '今日金价', '黄金价格', '黄金9999', '黄金T+D',
  '伦敦金', '纽约黄金', '白银价格', '铂金价格', '钯金价格',
  '投资类', '投资金条'
];

class JewelrySource extends BaseSource {
  constructor() {
    super({
      name: 'JEWELRY',
      displayName: '首饰金价',
      type: 'jewelry',
      timeout: 8000
    });
    this.url = 'https://tmini.net/api/gold-price?type=json';
  }

  async fetchOne() {
    const body = await fetch(this.url, {
      timeout: 7000,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    });

    if (!body || body.length < 50) {
      throw new Error('jewelry: empty response');
    }

    let json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      throw new Error('jewelry: invalid JSON response');
    }

    const stores = (json && Array.isArray(json.stores)) ? json.stores : [];
    if (!stores.length) {
      throw new Error('jewelry: no stores data');
    }

    // 提取品牌首饰店，排除汇总项和异常价格
    const brands = [];
    const seen = new Set();
    for (const s of stores) {
      const brandName = String(s.brand || '').trim();
      const price = parseFloat(s.price);

      if (!brandName || isNaN(price) || price < 500 || price > 2000) continue;
      if (EXCLUDE_KEYWORDS.some(k => brandName.includes(k))) continue;
      if (seen.has(brandName)) continue;

      seen.add(brandName);
      brands.push({
        brand: brandName,
        product: '足金999',
        price,
        unit: '元/克',
        updatedAt: s.updated || json.date || new Date().toISOString()
      });
    }

    if (!brands.length) {
      throw new Error('jewelry: no brand stores parsed');
    }

    // 精选品牌映射
    const featured = {};
    for (const b of brands) {
      if (FEATURED.includes(b.brand)) {
        featured[b.brand] = b;
      }
    }

    // 取行情时间：优先用 metals 里的更新时间，否则用日期
    const quoteTime = json.metals && json.metals[0] && json.metals[0].updated
      ? json.metals[0].updated
      : (json.date || new Date().toISOString());

    return {
      product: '首饰金价',
      bank: 'JEWELRY',
      bankName: '首饰金价',
      brands: brands.slice(0, 15),
      featured,
      source: 'tmini-api',
      quoteTime,
      raw: {
        count: brands.length,
        sample: brands.slice(0, 3),
        date: json.date
      }
    };
  }
}

module.exports = JewelrySource;
