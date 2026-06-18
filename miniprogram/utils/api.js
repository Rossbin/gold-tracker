/**
 * 公用 API 封装
 *   - getLatestPrice()：调云函数 getLatestPrice 拿最新
 *   - fetchNow()：调云函数 fetchGoldNow 触发立即抓取
 *   - updateSettings(opts)：调云函数 updateSettings
 *
 * 注意：云函数 fetchGoldNow 并发抓多个源，默认 6 秒会超时，
 * 这里统一把超时设到 20 秒（云函数 config 上限也是 20 秒）。
 */

const CF_TIMEOUT = 20000;

module.exports = {
  async getLatestPrice() {
    try {
      const r = await wx.cloud.callFunction({
        name: 'getLatestPrice',
        timeout: CF_TIMEOUT
      });
      if (r && r.result && r.result.ok) return r.result;
      throw new Error('getLatestPrice: bad response');
    } catch (err) {
      console.error('[api.getLatestPrice]', err);
      throw err;
    }
  },

  async fetchNow() {
    try {
      const r = await wx.cloud.callFunction({
        name: 'fetchGoldNow',
        timeout: CF_TIMEOUT
      });
      if (r && r.result && r.result.ok) return r.result;
      throw new Error('fetchNow: bad response');
    } catch (err) {
      console.error('[api.fetchNow]', err);
      throw err;
    }
  },

  async updateSettings(opts) {
    try {
      const r = await wx.cloud.callFunction({
        name: 'updateSettings',
        data: opts,
        timeout: CF_TIMEOUT
      });
      if (r && r.result && r.result.ok) return r.result;
      throw new Error('updateSettings: bad response');
    } catch (err) {
      console.error('[api.updateSettings]', err);
      throw err;
    }
  }
};
