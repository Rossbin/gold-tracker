// pages/settings/settings.js
const api = require('../../utils/api');

// ⚠️ 在小程序后台「订阅消息」中申请「价格变动 / 到价提醒」类模板，
// 把模板 ID 填到这里。模板需包含：品种、价格、涨跌幅、时间 等字段。
const NOTIFY_TMPL_ID = 'YOUR_TEMPLATE_ID';

const INTERVAL_OPTIONS = [
  { value: 10,  label: '10 秒（耗云函数额度）' },
  { value: 30,  label: '30 秒' },
  { value: 60,  label: '60 秒（推荐）' },
  { value: 120, label: '2 分钟' },
  { value: 300, label: '5 分钟（最省）' },
  { value: 600, label: '10 分钟' }
];

const THRESHOLD_OPTIONS = [
  { value: 0.5, label: '0.5%（敏感）' },
  { value: 1,   label: '1%（推荐）' },
  { value: 2,   label: '2%' },
  { value: 3,   label: '3%（稳健）' }
];

Page({
  data: {
    intervalOptions: INTERVAL_OPTIONS,
    currentInterval: 60,
    thresholdOptions: THRESHOLD_OPTIONS,
    currentThreshold: 1,
    notifyEnabled: false,
    subscribeQuota: 0
  },

  onLoad() {
    // 优先用本地缓存初始化（首页轮询也依赖这些缓存）
    this.setData({
      currentInterval: wx.getStorageSync('refreshInterval') || 60,
      currentThreshold: wx.getStorageSync('notifyThreshold') || 1,
      notifyEnabled: wx.getStorageSync('notifyEnabled') || false,
      subscribeQuota: wx.getStorageSync('subscribeQuota') || 0
    });
  },

  onShow() {
    // 每次进入设置页，尝试从云端同步最新配额（推送会扣减配额）
    this._syncQuotaFromCloud();
  },

  // ---- 刷新频率 ----
  onSelectInterval(e) {
    this.setData({ currentInterval: e.currentTarget.dataset.value });
  },

  // ---- 异动推送开关 ----
  onToggleNotify(e) {
    const val = e.detail.value;
    if (val) {
      // 开启 = 发起一次订阅授权（必须在用户点击的同步上下文中调用）
      this._requestSubscribe();
    } else {
      // 关闭：清空本地状态并通知云端移除订阅
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

  // ---- 阈值选择 ----
  onSelectThreshold(e) {
    const v = e.currentTarget.dataset.value;
    this.setData({ currentThreshold: v });
    wx.setStorageSync('notifyThreshold', v);
    // 阈值变化实时同步到云端，避免用户忘记点保存
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
        content: '请先在小程序后台申请订阅消息模板，并将模板 ID 填入 settings.js 的 NOTIFY_TMPL_ID。',
        showCancel: false
      });
      // 回退开关状态
      this.setData({ notifyEnabled: false });
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: [NOTIFY_TMPL_ID],
      success: (res) => {
        if (res[NOTIFY_TMPL_ID] === 'accept') {
          // 用户同意：配额 +1
          const quota = (wx.getStorageSync('subscribeQuota') || 0) + 1;
          this.setData({ notifyEnabled: true, subscribeQuota: quota });
          wx.setStorageSync('notifyEnabled', true);
          wx.setStorageSync('subscribeQuota', quota);
          wx.setStorageSync('notifyThreshold', this.data.currentThreshold);

          // 上报云端：注册/累加订阅用户配额
          api.updateSettings({
            notifyEnabled: true,
            notifyThreshold: this.data.currentThreshold,
            subscribeAction: 'add',
            tmplId: NOTIFY_TMPL_ID
          }).then(r => {
            // 以云端返回的实际配额为准（防止多端不同步）
            if (r && r.settings && typeof r.settings.quota === 'number') {
              this.setData({ subscribeQuota: r.settings.quota });
              wx.setStorageSync('subscribeQuota', r.settings.quota);
            }
          }).catch(() => {});

          wx.showToast({ title: '订阅成功', icon: 'success' });
        } else {
          // 用户拒绝或被限频
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
        // 云端配额归零时，前端开关状态也校正
        if (r.settings.quota === 0) {
          // 配额用尽不代表关闭订阅，只是暂时无法推送，保留开关开启以便续订
        }
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
