/**
 * 本地测试脚本 —— 测试所有金价源（无需云开发环境）
 *
 * 运行：
 *   node test-fetcher.js
 *
 * 只测本地能通的数据源（东方财富、招行、gold-api.com、首饰金价）
 * 工/建/中/农/交 云函数里走东财代理，这里走不了是正常的
 */

const { runAll } = require('../cloudfunctions/fetchGoldNow/sources/_orchestrator');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';

function fmt(n) { return n == null ? '--' : n.toFixed(2); }
function sign(n) { return n >= 0 ? '+' : ''; }
function arrow(n) { return n >= 0 ? '▲' : '▼'; }

async function main() {
  console.log(`${BOLD}========== 银行积存金金价本地抓取测试 ==========${RESET}`);
  console.log(`开始时间： ${new Date().toLocaleString('zh-CN')}\n`);

  const { results, succeeded, failed, totalLatencyMs } = await runAll();

  console.log(`${BOLD}========== 抓取汇总 ==========${RESET}`);
  console.log(`总耗时: ${totalLatencyMs}ms (并发)\n`);

  // 表头
  const headers = ['#', '银行', '代码', '卖出价', '买入价', '涨跌', '来源', '耗时', '状态'];
  const colWidths = [3, 18, 8, 10, 10, 10, 25, 8, 6];
  const sep = '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤';
  const row = (cells, status) => {
    const parts = cells.map((c, i) => String(c).padEnd(colWidths[i]));
    const s = status === 'ok' ? GREEN : status === 'warn' ? YELLOW : RED;
    return '│ ' + parts.join(' │ ') + ' │' + (status ? ` ${s}${status}${RESET}` : '');
  };

  console.log(sep);
  console.log(row(headers, ''));
  console.log(sep);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const status = r.ok ? (r.sellPrice ? '✅' : '⚠️') : '❌';
    const change = r.change != null ? `${sign(r.change)}${Math.abs(r.change).toFixed(2)}` : '--';
    const source = r.source || (r.error ? r.error.slice(0, 20) : '--');
    console.log(row([
      i,
      r.bankName || r.displayName || r.name || '--',
      r.bank || '--',
      r.sellPrice != null ? fmt(r.sellPrice) : '--',
      r.buyPrice != null ? fmt(r.buyPrice) : '--',
      change,
      source,
      r.latencyMs ? `${r.latencyMs}ms` : '--'
    ], r.ok ? (r.sellPrice ? 'ok' : 'warn') : 'fail'));
  }
  console.log(sep);

  console.log(`\n${BOLD}========== 成功 ${succeeded} / ${results.length} ==========${RESET}`);
  if (failed > 0) {
    console.log(`\n${RED}失败详情：${RESET}`);
    for (const r of results) {
      if (!r.ok) {
        console.log(`  [${r.bank || r.name}] ${r.error}`);
      }
    }
  }

  // 首饰金价详情
  const jewelryResult = results.find(r => r.source === 'jewelry-html' || r.source === 'jewelry');
  if (jewelryResult && jewelryResult.brands && jewelryResult.brands.length > 0) {
    console.log(`\n${BOLD}========== 首饰金价（参考，更新：${jewelryResult.quoteTime}） ==========${RESET}`);
    for (const b of jewelryResult.brands.slice(0, 10)) {
      console.log(`  ${b.brand} ${b.product}: ¥${b.price}元/克`);
    }
    console.log(`  ${YELLOW}注：数据来自 jinrijinjia.cn，可能滞后 1-3 天${RESET}`);
  }

  // 国际金价详情
  const intlResult = results.find(r => r.source === 'gold-api-com');
  if (intlResult && intlResult.ok) {
    console.log(`\n${BOLD}========== 国际金价（参考） ==========${RESET}`);
    const r = intlResult;
    console.log(`  XAU/USD: $${r.raw?.priceUSD_oz?.toFixed(2)}/oz`);
    console.log(`  换算CNY: ¥${r.raw?.priceCNY_g?.toFixed(2)}/克 (汇率 ${r.raw?.fxRate?.toFixed(4)})`);
    console.log(`  涨跌幅: ${sign(r.change)}${r.change?.toFixed(2)}元 (${r.changePct?.toFixed(2)}%)`);
  }

  console.log(`\n提示:`);
  console.log(`  - 工/建/中/农/交 本地走不了（依赖东财代理）；部署到云函数后全部通`);
  console.log(`  - gold-api.com 和首饰金价为新增参考源`);
  console.log(`  - 招行 m.cmbchina.com 是最稳的源`);
}

main().catch(console.error);
