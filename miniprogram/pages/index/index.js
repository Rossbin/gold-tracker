// pages/index/index.js
const api = require('../../utils/api');
const fmt = require('../../utils/format');

const BANK_ORDER = ['CMB', 'ICBC', 'CCB', 'BOC', 'ABC', 'BCM'];
const BANK_COLORS = {
  CMB:  '#e60012',
  ICBC: '#c8102e',
  CCB:  '#005bac',
  BOC:  '#b71c1c',
  ABC:  '#007d33',
  BCM:  '#003c8f'
};

Page({
  data: {
    list: [],
    international: null,
    jewelry: null,
    jewelryBrands: [],
    loading: false,
    refreshing: false,
    autoRefreshing: true,
    serverTime: null,
    lastUpdateTime: null,
    errorMsg: '',
    bankColors: BANK_COLORS
  },

  _timer: null,
  _prevPrices: {},

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

      // 1. 处理银行积存金数据
      const list = (r.bankData || r.list || []).map(item => {
        const prev = this._prevPrices[item.bank];
        const changed = prev && prev.sellPrice && Math.abs(item.sellPrice - prev.sellPrice) > 0.3;
        const isUp = item.change > 0;
        const isDown = item.change < 0;

        // 最高价/最低价兜底：优先用 raw 里的东财行情，其次用当前卖出价
        const rawEast = item.raw && (item.raw.eastData || item.raw.data);
        const highPrice = item.highPrice || (rawEast && rawEast.high) || item.sellPrice;
        const lowPrice = item.lowPrice || (rawEast && rawEast.low) || item.sellPrice;
        const openPrice = item.openPrice || (rawEast && rawEast.open);

        return {
          ...item,
          sellPriceText: fmt.formatPrice(item.sellPrice),
          buyPriceText: fmt.formatPrice(item.buyPrice),
          highPriceText: fmt.formatPrice(highPrice),
          lowPriceText: fmt.formatPrice(lowPrice),
          openPriceText: fmt.formatPrice(openPrice),
          changeText: fmt.formatChange(item.change),
          changePctText: fmt.formatChangePct(item.changePct),
          quoteTimeText: fmt.formatTime(item.quoteTime),
          fetchTimeText: fmt.timeAgo(item.fetchedAt),
          changed,
          isUp,
          isDown,
          isFlat: !isUp && !isDown
        };
      });
      list.sort((a, b) => BANK_ORDER.indexOf(a.bank) - BANK_ORDER.indexOf(b.bank));

      // 2. 处理国际金价
      let international = null;
      if (r.international && r.international.data) {
        const d = r.international.data;
        international = {
          sellPriceText: fmt.formatPrice(d.sellPrice),
          changeText: fmt.formatChange(d.change),
          changePctText: fmt.formatChangePct(d.changePct),
          change: d.change,
          changePct: d.changePct,
          rawPriceUSD: d.raw ? d.raw.priceUSD_oz : null,
          highUSD: d.raw ? d.raw.highUSD_oz : null,
          lowUSD: d.raw ? d.raw.lowUSD_oz : null,
          fxRate: d.raw ? d.raw.fxRate : null,
          quoteTimeText: fmt.formatTime(d.quoteTime)
        };
      }

      // 3. 处理首饰金价
      let jewelry = null;
      let jewelryBrands = [];
      if (r.jewelry && r.jewelry.data) {
        const d = r.jewelry.data;
        jewelry = {
          quoteTimeText: fmt.formatTime(d.quoteTime),
          brandCount: d.brands ? d.brands.length : 0
        };
        if (d.featured) {
          jewelryBrands = Object.entries(d.featured).map(([name, info]) => ({
            brand: name,
            price: info.price,
            product: info.product
          }));
        } else if (d.brands) {
          jewelryBrands = d.brands.slice(0, 6).map(b => ({
            brand: b.brand,
            price: b.price,
            product: b.product
          }));
        }
      }

      this.setData({
        list,
        international,
        jewelry,
        jewelryBrands,
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
