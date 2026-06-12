/**
 * 调度器：并发跑所有数据源，标准化 + 落库 + 错误聚合
 */

const CMBSource = require('./cmb');
const ICBCSource = require('./icbc');
const CCBSource = require('./ccb');
const BOCSource = require('./boc');
const ABCSource = require('./abc');
const BCMSource = require('./bcm');
const SGESource = require('./sge');
const EastMoneySource = require('./eastmoney');
const TencentSource = require('./tencent');

/**
 * 6 家银行，按抓取难度+稳定性排序
 * 招行(原生API) > 工行(Servlet) > 建行(HTML) > 中/农/交(SGE代理)
 */
function getAllBankSources() {
  return [
    new CMBSource(),
    new ICBCSource(),
    new CCBSource(),
    new BOCSource(),
    new ABCSource(),
    new BCMSource()
  ];
}

function getAllBackupSources() {
  return [
    new SGESource(),
    new EastMoneySource()
    // TencentSource 国际金价参考，独立输出，不在主流程
  ];
}

/**
 * 并发跑所有源，带超时
 * 返回：{ results: [...], succeeded: n, failed: m, totalLatencyMs: n }
 */
async function runAll(opts = {}) {
  const banks = opts.banks || getAllBankSources();
  const backups = opts.backups || getAllBackupSources();

  const start = Date.now();
  const tasks = [...banks, ...backups].map(src => src.fetch());
  const results = await Promise.all(tasks);
  const totalLatencyMs = Date.now() - start;
  const succeeded = results.filter(r => r.ok).length;
  const failed = results.length - succeeded;

  return { results, succeeded, failed, totalLatencyMs };
}

module.exports = {
  runAll,
  getAllBankSources,
  getAllBackupSources
};
