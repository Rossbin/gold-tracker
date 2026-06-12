/**
 * 公用 API 封装
 *   - getLatestPrice()：调云函数 getLatestPrice 拿最新
 *   - fetchNow()：调云函数 fetchGoldNow 触发立即抓取
 *   - updateSettings(opts)：调云函数 updateSettings
 */

module.exports = {
  async getLatestPrice() {
    try {
      const r = await wx.cloud.callFunction({ name: 'getLatestPrice' });
      if (r && r.result && r.result.ok) return r.result;
      throw new Error('getLatestPrice: bad response');
    } catch (err) {
      console.error('[api.getLatestPrice]', err);
      throw err;
    }
  },

  async fetchNow() {
    try {
      const r = await wx.cloud.callFunction({ name: 'fetchGoldNow' });
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
        data: opts
      });
      if (r && r.result && r.result.ok) return r.result;
      throw new Error('updateSettings: bad response');
    } catch (err) {
      console.error('[api.updateSettings]', err);
      throw err;
    }
  }
};
