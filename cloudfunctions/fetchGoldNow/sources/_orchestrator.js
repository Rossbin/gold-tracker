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
const JewelrySource   = require('./jewelry');

/**
 * 银行积存金源（6 家）
 */
function getAllBankSources() {
  return [
    new CMBSource(),   // 招行：真实 API
    new ICBCSource(),  // 工行：东财代理
    new CCBSource(),  // 建行：东财代理
    new BOCSource(),   // 中行：东财代理
    new ABCSource(),   // 农行：东财代理
    new BCMSource()   // 交行：东财代理
  ];
}

/**
 * 备份 / 基准源
 */
function getAllBackupSources() {
  return [
    new SGESource(),       // SGE 官方日 K（可能超时）
    new EastMoneySource()   // 东财实时（最稳）
  ];
}

/**
 * 额外参考源（独立展示，不进主卡片）
 */
function getAllExtraSources() {
  return [
    new GoldAPISource(),   // 国际金价 XAU/USD
    new JewelrySource()     // 首饰金价（周大福等品牌）
  ];
}

/**
 * 并发跑所有源，带超时
 */
async function runAll(opts = {}) {
  const banks   = opts.banks  || getAllBankSources();
  const backups = opts.backups || getAllBackupSources();
  const extras  = opts.extras || getAllExtraSources();

  const start = Date.now();
  const tasks = [...banks, ...backups, ...extras].map(src => src.fetch());
  const results = await Promise.all(tasks);
  const totalLatencyMs = Date.now() - start;
  const succeeded = results.filter(r => r.ok).length;
  const failed = results.length - succeeded;

  return { results, succeeded, failed, totalLatencyMs };
}

module.exports = {
  runAll,
  getAllBankSources,
  getAllBackupSources,
  getAllExtraSources
};
