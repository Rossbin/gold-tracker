/**
 * 格式化工具
 */

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function formatTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatPrice(n) {
  if (n == null || isNaN(n)) return '--';
  return Number(n).toFixed(2);
}

function formatChangePct(n) {
  if (n == null || isNaN(n)) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Number(n).toFixed(2)}%`;
}

function formatChange(n) {
  if (n == null || isNaN(n)) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Number(n).toFixed(2)}`;
}

function timeAgo(ts) {
  if (!ts) return '--';
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

module.exports = {
  formatTime,
  formatPrice,
  formatChange,
  formatChangePct,
  timeAgo
};
