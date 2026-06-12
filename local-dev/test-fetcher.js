/**
 * 本地测试入口 —— 跑一遍所有 6 行 + 3 备份源，看哪个能拿到数据
 *
 * 运行：node local-dev/test-fetcher.js
 *
 * 不依赖微信云开发；用 axios 代替 request-promise。
 */

const path = require('path');
const { runAll, getAllBankSources, getAllBackupSources } = require('../cloudfunctions/fetchGoldNow/sources/_orchestrator');

(async () => {
  console.log('========== 银行积存金金价本地抓取测试 ==========');
  console.log('开始时间：', new Date().toLocaleString());
  console.log('');

  const start = Date.now();
  const { results, succeeded, failed, totalLatencyMs } = await runAll();
  const total = Date.now() - start;

  console.log(`\n========== 抓取汇总 ==========`);
  console.log(`总耗时: ${total}ms (并发 ${totalLatencyMs}ms)`);
  console.log(`成功: ${succeeded} / ${results.length}    失败: ${failed}`);
  console.log('');

  // 表格化输出
  const rows = results.map(r => ({
    银行: r.bankName,
    代码: r.bank,
    卖出价: r.sellPrice ? r.sellPrice.toFixed(2) : '--',
    买入价: r.buyPrice ? r.buyPrice.toFixed(2) : '--',
    涨跌: r.change != null ? (r.change > 0 ? '+' : '') + r.change.toFixed(2) : '--',
    来源: r.source,
    耗时: (r.latencyMs || 0) + 'ms',
    状态: r.ok ? '✅' : '❌'
  }));
  console.table(rows);

  if (failed > 0) {
    console.log('\n========== 失败详情 ==========');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`[${r.bank}] ${r.bankName} :: ${r.error}`);
    });
  }

  console.log('\n提示:');
  console.log('  - 工/建/中/农/交 部分依赖 cookie、登录态、浏览器渲染，本地环境 50% 概率失败属正常');
  console.log('  - 招行 m.cmbchina.com 是最稳的源，部署到云函数后成功率会更高');
  console.log('  - 东方财富、SGE、京东金融是第三方回退源');
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
