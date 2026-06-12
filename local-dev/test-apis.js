/**
 * Gold Price API 测试脚本
 * 测试多个黄金价格API的可用性
 */

const axios = require('axios');

const TIMEOUT = 5000; // 5秒超时

// API 配置列表
const APIs = [
  // 国内免费无需KEY
  {
    name: 'gold-api.com (免费)',
    url: 'https://api.gold-api.com/price/XAU',
    method: 'GET',
    needKey: false,
    free: true,
    note: '免费无需注册，支持XAU/XAG'
  },
  // 国际免费无需KEY
  {
    name: 'metals-api.com (demo key)',
    url: 'https://metals-api.com/api/latest?access_key=goldapi-io&base=USD&symbols=XAU',
    method: 'GET',
    needKey: false,
    free: true,
    note: 'demo key无效，需要真实key'
  },
  {
    name: 'freegoldapi.com',
    url: 'https://freegoldapi.com/api/v1/gold-price',
    method: 'GET',
    needKey: false,
    free: true,
    note: '返回404，域名已失效'
  },
  {
    name: 'goldprice.org',
    url: 'https://data.goldprice.org/dbXRates',
    method: 'GET',
    needKey: false,
    free: true,
    note: 'Cloudflare保护，需要真实浏览器'
  },
  {
    name: 'plusapi.cn (聚合数据)',
    url: 'https://way.jd100.com/api?type=gold',
    method: 'GET',
    needKey: false,
    free: true,
    note: '无响应'
  },
  {
    name: 'gold-api.com',
    url: 'https://www.gold-api.com/',
    method: 'GET',
    needKey: false,
    free: true,
    note: '301重定向，无法获取JSON'
  },
  {
    name: 'metals-api.io',
    url: 'https://metals-api.io/api/latest?app_id=gold&base=USD&symbols=XAU',
    method: 'GET',
    needKey: false,
    free: true,
    note: '无响应'
  },
  {
    name: 'cngold.org.cn',
    url: 'https://www.cngold.org.cn/goldprice.html',
    method: 'GET',
    needKey: false,
    free: true,
    note: '页面不存在'
  },
  {
    name: 'huijinwang.com',
    url: 'http://www.huijinwang.com/gold/',
    method: 'GET',
    needKey: false,
    free: true,
    note: '403 Forbidden'
  },
  {
    name: 'metals.live',
    url: 'https://metals.live/api/spot',
    method: 'GET',
    needKey: false,
    free: true,
    note: '跳转页面，非API'
  },
  // 需要KEY的API
  {
    name: 'fixer.io',
    url: 'http://data.fixer.io/api/latest?access_key=demo&base=EUR&symbols=XAU',
    method: 'GET',
    needKey: true,
    free: true,
    note: 'demo key无效'
  },
  {
    name: 'metalpriceapi.com',
    url: 'https://api.metalpriceapi.com/v1/latest?api_key=demo&currencies=XAU',
    method: 'GET',
    needKey: true,
    free: true,
    note: 'demo key无效'
  },
  {
    name: 'commodities-api.com',
    url: 'https://api.commodities-api.com/api/latest?access_key=demo&base=USD&symbols=GOLD',
    method: 'GET',
    needKey: true,
    free: true,
    note: 'demo key无效'
  },
  {
    name: 'openexchangerates.org',
    url: 'https://openexchangerates.org/api/latest.json?app_id=demo&base=USD&symbols=XAU',
    method: 'GET',
    needKey: true,
    free: true,
    note: 'demo app_id无效'
  },
  {
    name: 'exchangerate-api.com',
    url: 'https://api.exchangerate-api.com/v4/latest/XAU',
    method: 'GET',
    needKey: false,
    free: true,
    note: 'XAU不被支持'
  },
  {
    name: 'alphavantage.co',
    url: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=demo',
    method: 'GET',
    needKey: true,
    free: true,
    note: 'demo key有效但功能受限'
  },
  {
    name: 'marketstack',
    url: 'https://api.marketstack.com/v1/eod?access_key=demo&symbols=XAU',
    method: 'GET',
    needKey: true,
    free: true,
    note: 'demo key无效'
  },
  // 其他尝试
  {
    name: 'preciousmetalrates.com',
    url: 'https://api.preciousmetalrates.com/v1/latest?access_key=demo&base=USD&symbols=XAU',
    method: 'GET',
    needKey: true,
    free: true,
    note: '无响应'
  },
  {
    name: 'goldapi.io',
    url: 'https://goldapi.io/api/XAU/USD',
    method: 'GET',
    needKey: true,
    free: true,
    note: '无响应'
  },
  {
    name: 'api.goldapi.com',
    url: 'https://api.goldapi.com/spot',
    method: 'GET',
    needKey: true,
    free: true,
    note: '无响应'
  },
];

// 测试单个API
async function testAPI(api) {
  const startTime = Date.now();
  try {
    const response = await axios({
      method: api.method,
      url: api.url,
      timeout: TIMEOUT,
      validateStatus: () => true, // 接受所有状态码
    });

    const duration = Date.now() - startTime;
    const isJson = typeof response.data === 'object' && response.data !== null;
    const hasPriceData = isJson && (
      response.data.price !== undefined ||
      response.data.rate !== undefined ||
      response.data.rates !== undefined ||
      response.data.data !== undefined
    );

    const status = response.status >= 200 && response.status < 400 ? '✓ 通' : `✗ ${response.status}`;
    const responsePreview = typeof response.data === 'string'
      ? response.data.substring(0, 200)
      : JSON.stringify(response.data).substring(0, 200);

    return {
      ...api,
      status,
      duration: `${duration}ms`,
      responsePreview,
      isJson,
      hasPriceData,
      success: response.status >= 200 && response.status < 400 && isJson && hasPriceData
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      ...api,
      status: `✗ ${error.code || 'Error'}`,
      duration: `${duration}ms`,
      responsePreview: error.message,
      isJson: false,
      hasPriceData: false,
      success: false
    };
  }
}

// 主测试函数
async function runTests() {
  console.log('='.repeat(80));
  console.log('黄金价格 API 可用性测试');
  console.log('='.repeat(80));
  console.log();

  const results = [];
  for (const api of APIs) {
    const result = await testAPI(api);
    results.push(result);
  }

  // 输出表格
  console.log('| API | URL | 免费? | KEY? | 状态 | 响应样例 | 适合用途 |');
  console.log('|---|---|---|---|---|---|---|');

  for (const r of results) {
    const urlShort = r.url.length > 50 ? r.url.substring(0, 47) + '...' : r.url;
    const preview = r.responsePreview.replace(/\n/g, ' ').substring(0, 60);
    const freeText = r.free ? '是' : '否';
    const keyText = r.needKey ? '是' : '否';
    console.log(`| ${r.name} | ${urlShort} | ${freeText} | ${keyText} | ${r.status} | ${preview} | ${r.note} |`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('测试完成');
  console.log('='.repeat(80));

  // 只返回真正可用的API
  const workingAPIs = results.filter(r => r.success);
  console.log(`\n可用的API数量: ${workingAPIs.length}`);

  if (workingAPIs.length > 0) {
    console.log('\n可用的API:');
    for (const api of workingAPIs) {
      console.log(`  - ${api.name}: ${api.url}`);
    }
  }

  return workingAPIs;
}

// 直接获取gold-api.com的价格（唯一可用的免费API）
async function fetchGoldPrice() {
  try {
    const response = await axios.get('https://api.gold-api.com/price/XAU', { timeout: TIMEOUT });
    return response.data;
  } catch (error) {
    console.error('获取黄金价格失败:', error.message);
    return null;
  }
}

// 获取白银价格
async function fetchSilverPrice() {
  try {
    const response = await axios.get('https://api.gold-api.com/price/XAG', { timeout: TIMEOUT });
    return response.data;
  } catch (error) {
    console.error('获取白银价格失败:', error.message);
    return null;
  }
}

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
  runTests().then(workingAPIs => {
    console.log('\n--- 直接获取黄金价格测试 ---');
    return fetchGoldPrice();
  }).then(price => {
    if (price) {
      console.log('黄金价格:', JSON.stringify(price, null, 2));
    }
    process.exit(0);
  }).catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  fetchGoldPrice,
  fetchSilverPrice,
  testAPI
};
