// pages/settings/settings.js
const api = require('../../utils/api');

const INTERVAL_OPTIONS = [
  { value: 10,  label: '10 秒（耗云函数额度）' },
  { value: 30,  label: '30 秒' },
  { value: 60,  label: '60 秒（推荐）' },
  { value: 120, label: '2 分钟' },
  { value: 300, label: '5 分钟（最省）' },
  { value: 600, label: '10 分钟' }
];

Page({
  data: {
    intervalOptions: INTERVAL_OPTIONS,
    currentInterval: 60,
    notifyEnabled: false
  },

  onLoad() {
    const app = getApp();
    const cached = wx.getStorageSync('refreshInterval') || 60;
    this.setData({
      currentInterval: cached,
      notifyEnabled: wx.getStorageSync('notifyEnabled') || false
    });
  },

  onSelectInterval(e) {
    const v = e.currentTarget.dataset.value;
    this.setData({ currentInterval: v });
  },

  onToggleNotify(e) {
    this.setData({ notifyEnabled: e.detail.value });
  },

  async onSave() {
    wx.showLoading({ title: '保存中...' });
    try {
      await api.updateSettings({
        refreshInterval: this.data.currentInterval,
        notifyEnabled: this.data.notifyEnabled
      });
      // 同步到本地缓存和 app 全局
      const app = getApp();
      app.globalData.refreshInterval = this.data.currentInterval;
      wx.setStorageSync('refreshInterval', this.data.currentInterval);
      wx.setStorageSync('notifyEnabled', this.data.notifyEnabled);
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
