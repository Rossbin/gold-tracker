/**
 * 格式化工具
 */

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/**
 * 兼容 iOS 的时间格式化
 * iOS 只支持：yyyy/MM/dd、yyyy-MM-dd、yyyy-MM-ddTHH:mm:ss 等格式
 * 微信云函数返回的 ISO 字符串可能带空格，需替换为 T
 */
function parseDate(ts) {
  if (!ts) return null;
  // 统一把空格替换为 T，兼容 iOS
  const normalized = String(ts).replace(' ', 'T');
  return new Date(normalized);
}

function formatTime(ts) {
  if (!ts) return '--';
  const d = parseDate(ts);
  if (!d || isNaN(d.getTime())) return '--';
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
  const d = parseDate(ts);
  if (!d || isNaN(d.getTime())) return '--';
  const diff = (Date.now() - d.getTime()) / 1000;
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
