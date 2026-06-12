/**
 * 测试单个适配器
 * 用法：node local-dev/test-single.js cmb
 */

const args = process.argv.slice(2);
const sourceName = (args[0] || 'cmb').toLowerCase();

const map = {
  cmb: '../cloudfunctions/fetchGoldNow/sources/cmb',
  icbc: '../cloudfunctions/fetchGoldNow/sources/icbc',
  ccb: '../cloudfunctions/fetchGoldNow/sources/ccb',
  boc: '../cloudfunctions/fetchGoldNow/sources/boc',
  abc: '../cloudfunctions/fetchGoldNow/sources/abc',
  bcm: '../cloudfunctions/fetchGoldNow/sources/bcm',
  sge: '../cloudfunctions/fetchGoldNow/sources/sge',
  eastmoney: '../cloudfunctions/fetchGoldNow/sources/eastmoney',
  tencent: '../cloudfunctions/fetchGoldNow/sources/tencent'
};

const mod = map[sourceName];
if (!mod) {
  console.error('未知源。可用:', Object.keys(map).join(', '));
  process.exit(1);
}

const Source = require(mod);
const s = new Source();

(async () => {
  console.log(`测试 [${sourceName}] ...`);
  const r = await s.fetch();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
})();
