/**
 * 调度器：并发跑所有数据源，标准化 + 落库 + 错误聚合
 */

const CMBSource       = require('./cmb');
const ICBCSource      = require('./icbc');
const CCBSource       = require('./ccb');
const BOCSource       = require('./boc');
const ABCSource       = require('./abc');
const BCMSource       = require('./bcm');
const SGESource       = require('./sge');
const EastMoneySource = require('./eastmoney');
const GoldAPISource   = require('./gold-api');
const TencentSource   = require('./tencent');
const JewelrySource   = require('./jewelry');

/**
 * 银行积存金源（6 家）
 */
function getAllBankSources() {
  return [
    new CMBSource(),   // 招行：真实 API
    new ICBCSource(),  // 工行：东财代理 + 工行代理
    new CCBSource(),   // 建行：东财代理
    new BOCSource(),   // 中行：东财代理
    new ABCSource(),   // 农行：东财代理
    new BCMSource()    // 交行：东财代理
  ];
}

/**
 * 备份 / 基准源
 */
function getAllBackupSources() {
  return [
    new SGESource(),       // SGE 官方日 K（可能超时）
    new EastMoneySource()  // 东财实时（最稳）
  ];
}

/**
 * 额外参考源（独立展示，不进主卡片）
 *
 * 国际金价同时取 gold-api.com 和腾讯 COMEX，
 * 两者互备：gold-api 在部分云环境可能被限，腾讯在国内更稳定。
 */
function getAllExtraSources() {
  return [
    new GoldAPISource(),   // 国际金价 XAU/USD（部分云环境可能被限）
    new TencentSource(),   // 腾讯 COMEX 国际金价（国内稳定）
    new JewelrySource()    // 首饰金价（周大福等品牌）
  ];
}

/**
 * 并发跑所有源
 * 云函数超时已改为 20 秒（config.json），留足时间给慢源
 * 全局兜底 15 秒，写库留 5 秒
 */
async function runAll(opts = {}) {
  const banks   = opts.banks  || getAllBankSources();
  const backups = opts.backups || getAllBackupSources();
  const extras  = opts.extras || getAllExtraSources();

  const start = Date.now();
  const GLOBAL_TIMEOUT = 15000; // 15 秒全局兜底
  const allSources = [...banks, ...backups, ...extras];
  const allPromises = allSources.map(src => src.fetch());

  let settled;
  try {
    settled = await Promise.race([
      Promise.all(allPromises),
      new Promise((_, rej) => setTimeout(() => rej(new Error('__TIMEOUT__')), GLOBAL_TIMEOUT))
    ]);
  } catch (e) {
    // 等待已完成的请求结果（不会中断正在跑的 HTTP 请求）
    settled = await Promise.all(allPromises.map(p => p.catch(err => ({
      bank: allSources[allPromises.indexOf(p)]?.name || 'unknown',
      ok: false,
      error: err && err.message !== '__TIMEOUT__' ? err.message : 'timeout'
    }))));
  }

  const results = settled;
  const succeeded = results.filter(r => r.ok).length;
  const failed = results.length - succeeded;
  const totalLatencyMs = Date.now() - start;

  return { results, succeeded, failed, totalLatencyMs };
}

module.exports = {
  runAll,
  getAllBankSources,
  getAllBackupSources,
  getAllExtraSources
};
