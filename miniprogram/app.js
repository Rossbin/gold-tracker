// app.js —— 微信小程序入口
App({
  globalData: {
    userInfo: null,
    refreshInterval: 60,  // 默认 60 秒轮询
    lastPrices: {}        // 上一次的价格缓存（用于异动高亮判断）
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前微信版本过低，请升级到最新微信后再使用');
      return;
    }
    wx.cloud.init({
      env: 'your-env-id',   // ⚠️ 部署时改为你的云开发环境 ID
      traceUser: true
    });
    // 加载用户设置
    this.loadSettings();
  },

  async loadSettings() {
    try {
      const r = await wx.cloud.callFunction({ name: 'getLatestPrice' }).catch(() => null);
      // getLatestPrice 本身不返回 settings，这里简单用本地缓存
      const cached = wx.getStorageSync('refreshInterval');
      if (cached) this.globalData.refreshInterval = cached;
    } catch (e) {}
  }
});
