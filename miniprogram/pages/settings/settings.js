// pages/settings/settings.js
const api = require('../../utils/api');

// ⚠️ 在小程序后台「订阅消息」中申请「价格变动 / 到价提醒」类模板，
// 把模板 ID 填到这里。模板建议包含：机构名称、当前价格、今日最高价格 等字段。
const NOTIFY_TMPL_ID = 'YOUR_TEMPLATE_ID';

const INTERVAL_OPTIONS = [
  { value: 10,  label: '10 秒（耗云函数额度）' },
  { value: 30,  label: '30 秒' },
  { value: 60,  label: '60 秒（推荐）' },
  { value: 120, label: '2 分钟' },
  { value: 300, label: '5 分钟（最省）' },
  { value: 600, label: '10 分钟' }
];

// 降价提醒金额阈值（元/克）：相对于今日最高价，每降多少元推送一次
const THRESHOLD_OPTIONS = [
  { value: 5,  label: '5 元（敏感）' },
  { value: 10, label: '10 元（推荐）' },
  { value: 20, label: '20 元' },
  { value: 30, label: '30 元（稳健）' }
];

Page({
  data: {
    intervalOptions: INTERVAL_OPTIONS,
    currentInterval: 60,
    thresholdOptions: THRESHOLD_OPTIONS,
    currentThreshold: 10,
    notifyEnabled: false,
    subscribeQuota: 0
  },

  onLoad() {
    // 注意：本地可能缓存了旧版的百分比阈值（0.5/1/2/3），新版默认值是 10 元
    const cachedThreshold = wx.getStorageSync('notifyThreshold');
    const validThreshold = THRESHOLD_OPTIONS.some(o => o.value === cachedThreshold)
      ? cachedThreshold
      : 10;

    this.setData({
      currentInterval: wx.getStorageSync('refreshInterval') || 60,
      currentThreshold: validThreshold,
      notifyEnabled: wx.getStorageSync('notifyEnabled') || false,
      subscribeQuota: wx.getStorageSync('subscribeQuota') || 0
    });
  },

  onShow() {
    this._syncQuotaFromCloud();
  },

  // ---- 刷新频率 ----
  onSelectInterval(e) {
    this.setData({ currentInterval: e.currentTarget.dataset.value });
  },

  // ---- 降价推送开关 ----
  onToggleNotify(e) {
    const val = e.detail.value;
    if (val) {
      this._requestSubscribe();
    } else {
      this.setData({ notifyEnabled: false, subscribeQuota: 0 });
      wx.setStorageSync('notifyEnabled', false);
      wx.setStorageSync('subscribeQuota', 0);
      api.updateSettings({
        notifyEnabled: false,
        unsubscribe: true,
        notifyThreshold: this.data.currentThreshold
      }).catch(() => {});
      wx.showToast({ title: '已关闭推送', icon: 'none' });
    }
  },

  // ---- 降价阈值选择 ----
  onSelectThreshold(e) {
    const v = e.currentTarget.dataset.value;
    this.setData({ currentThreshold: v });
    wx.setStorageSync('notifyThreshold', v);
    if (this.data.notifyEnabled) {
      api.updateSettings({
        notifyEnabled: true,
        notifyThreshold: v
      }).catch(() => {});
    }
  },

  // ---- 重新订阅 / 续订 ----
  onResubscribe() {
    this._requestSubscribe();
  },

  // 核心：发起订阅消息授权
  _requestSubscribe() {
    if (!NOTIFY_TMPL_ID || NOTIFY_TMPL_ID === 'YOUR_TEMPLATE_ID') {
      wx.showModal({
        title: '模板未配置',
        content: '请先在小程序后台申请订阅消息模板，并将模板 ID 填入 settings.js 的 NOTIFY_TMPL_ID。模板建议包含：机构名称、当前价格、今日最高价格。',
        showCancel: false
      });
      this.setData({ notifyEnabled: false });
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: [NOTIFY_TMPL_ID],
      success: (res) => {
        if (res[NOTIFY_TMPL_ID] === 'accept') {
          const quota = (wx.getStorageSync('subscribeQuota') || 0) + 1;
          this.setData({ notifyEnabled: true, subscribeQuota: quota });
          wx.setStorageSync('notifyEnabled', true);
          wx.setStorageSync('subscribeQuota', quota);
          wx.setStorageSync('notifyThreshold', this.data.currentThreshold);

          api.updateSettings({
            notifyEnabled: true,
            notifyThreshold: this.data.currentThreshold,
            subscribeAction: 'add',
            tmplId: NOTIFY_TMPL_ID
          }).then(r => {
            if (r && r.settings && typeof r.settings.quota === 'number') {
              this.setData({ subscribeQuota: r.settings.quota });
              wx.setStorageSync('subscribeQuota', r.settings.quota);
            }
          }).catch(() => {});

          wx.showToast({ title: '订阅成功', icon: 'success' });
        } else {
          this.setData({ notifyEnabled: this.data.subscribeQuota > 0 });
          wx.showToast({ title: '未授权订阅', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ notifyEnabled: this.data.subscribeQuota > 0 });
        wx.showToast({ title: '订阅请求失败', icon: 'none' });
      }
    });
  },

  // 从云端同步最新配额
  async _syncQuotaFromCloud() {
    if (!this.data.notifyEnabled) return;
    try {
      const r = await api.updateSettings({
        notifyEnabled: true,
        notifyThreshold: this.data.currentThreshold,
        subscribeAction: 'query'
      });
      if (r && r.settings && typeof r.settings.quota === 'number') {
        this.setData({ subscribeQuota: r.settings.quota });
        wx.setStorageSync('subscribeQuota', r.settings.quota);
      }
    } catch (e) {}
  },

  // ---- 保存 ----
  async onSave() {
    wx.showLoading({ title: '保存中...' });
    try {
      await api.updateSettings({
        refreshInterval: this.data.currentInterval,
        notifyEnabled: this.data.notifyEnabled,
        notifyThreshold: this.data.currentThreshold
      });
      const app = getApp();
      app.globalData.refreshInterval = this.data.currentInterval;
      app.globalData.notifyThreshold = this.data.currentThreshold;
      wx.setStorageSync('refreshInterval', this.data.currentInterval);
      wx.setStorageSync('notifyThreshold', this.data.currentThreshold);
      wx.setStorageSync('notifyEnabled', this.data.notifyEnabled);
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
