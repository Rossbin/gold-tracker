// pages/index/index.js
const api = require('../../utils/api');
const fmt = require('../../utils/format');

const BANK_ORDER = ['ICBC', 'CCB', 'ABC', 'BOC', 'BCM', 'CMB'];
const BANK_COLORS = {
  ICBC: '#c8102e',  // 工行红
  CCB:   '#005bac', // 建行蓝
  ABC:   '#007d33', // 农行绿
  BOC:   '#b71c1c', // 中行红
  BCM:   '#003c8f', // 交行蓝
  CMB:   '#e60012'  // 招行红
};

Page({
  data: {
    list: [],
    loading: false,
    refreshing: false,
    autoRefreshing: true,
    serverTime: null,
    lastUpdateTime: null,
    errorMsg: '',
    bankColors: BANK_COLORS
  },

  _timer: null,
  _prevPrices: {},   // 上一帧价格缓存（用于异动高亮）

  onLoad() {
    this.refresh();
  },

  onShow() {
    const app = getApp();
    this.setData({ autoRefreshing: app.globalData.refreshInterval > 0 });
    this._startAutoRefresh();
  },

  onHide() {
    this._stopAutoRefresh();
  },

  onUnload() {
    this._stopAutoRefresh();
  },

  onPullDownRefresh() {
    this.refresh(true);
  },

  _startAutoRefresh() {
    this._stopAutoRefresh();
    const app = getApp();
    const interval = (app.globalData.refreshInterval || 60) * 1000;
    this._timer = setInterval(() => {
      this.refresh();
    }, interval);
  },

  _stopAutoRefresh() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  // 拉取最新金价
  async refresh(fromPullDown = false) {
    if (this.data.loading) return;
    this.setData({ loading: true, errorMsg: '', refreshing: fromPullDown });

    try {
      const r = await api.getLatestPrice();
      const list = (r.list || []).map(item => {
        const prev = this._prevPrices[item.bank];
        const changed = prev && prev.sellPrice && Math.abs(item.sellPrice - prev.sellPrice) > 0.3;
        return {
          ...item,
          sellPriceText: fmt.formatPrice(item.sellPrice),
          buyPriceText: fmt.formatPrice(item.buyPrice),
          changeText: fmt.formatChange(item.change),
          changePctText: fmt.formatChangePct(item.changePct),
          quoteTimeText: fmt.formatTime(item.quoteTime),
          fetchTimeText: fmt.timeAgo(item.fetchedAt),
          changed
        };
      });
      // 按 BANK_ORDER 排序
      list.sort((a, b) => BANK_ORDER.indexOf(a.bank) - BANK_ORDER.indexOf(b.bank));
      this.setData({
        list,
        serverTime: r.serverTime,
        lastUpdateTime: Date.now(),
        loading: false,
        refreshing: false
      });
      // 缓存最新价格供下次对比
      this._prevPrices = {};
      list.forEach(item => { this._prevPrices[item.bank] = item; });
      // 3 秒后清除高亮
      setTimeout(() => {
        this.setData({ list: this.data.list.map(i => ({ ...i, changed: false })) });
      }, 3000);
    } catch (err) {
      this.setData({
        loading: false,
        refreshing: false,
        errorMsg: err.message || '加载失败'
      });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  // 立即刷新按钮
  async onTapRefreshNow() {
    if (this.data.loading) return;
    wx.showLoading({ title: '抓取中...', mask: true });
    try {
      await api.fetchNow();
      await this.refresh();
      wx.showToast({ title: '刷新完成', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '刷新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  }
});
