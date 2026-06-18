// app.js —— 微信小程序入口
App({
  globalData: {
    userInfo: null,
    refreshInterval: 60,    // 默认 60 秒轮询
    notifyThreshold: 1,     // 异动推送阈值（百分比）
    subscribeQuota: 0,      // 订阅消息剩余可接收条数
    lastPrices: {}          // 上一次的价格缓存（用于异动高亮判断）
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

  // 从本地缓存恢复用户设置到全局
  loadSettings() {
    const cachedInterval = wx.getStorageSync('refreshInterval');
    if (cachedInterval) this.globalData.refreshInterval = cachedInterval;

    const cachedThreshold = wx.getStorageSync('notifyThreshold');
    if (cachedThreshold) this.globalData.notifyThreshold = cachedThreshold;

    const cachedQuota = wx.getStorageSync('subscribeQuota');
    if (typeof cachedQuota === 'number') this.globalData.subscribeQuota = cachedQuota;
  }
});
