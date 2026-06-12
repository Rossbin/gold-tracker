/**
 * 适配器基类 —— 所有银行/备份源都继承本类
 *
 * 统一接口：
 *   - name：唯一标识（英文短码）
 *   - displayName：中文名
 *   - type：'bank' | 'backup'
 *   - fetch()：异步，返回标准化 GoldPrice 对象
 *   - timeout(ms)：单次请求超时
 *
 * 子类只需实现 fetchOne() 即可。
 */

class BaseSource {
  constructor(opts = {}) {
    this.name = opts.name || 'unknown';
    this.displayName = opts.displayName || '未命名';
    this.type = opts.type || 'backup';
    this.timeout = opts.timeout || 2500;
    this.product = opts.product || 'Au99.99';
  }

  /**
   * 子类必须返回的对象结构：
   * {
   *   bank: 'CMB',                 // 银行/源标识
   *   bankName: '招商银行',
   *   product: 'Au99.99',
   *   buyPrice: 909.20,            // 银行买入价（可 null）
   *   sellPrice: 910.50,           // 银行卖出价（不可空）
   *   midPrice: 909.85,            // 中间价
   *   change: 1.30,
   *   changePct: 0.14,
   *   source: 'cmb-api',           // 数据来源标识
   *   quoteTime: '2026-06-12T10:02:00+08:00',
   *   fetchedAt: 1718160120000,
   *   isStale: false,
   *   ok: true,
   *   error: null
   * }
   */
  async fetch() {
    const start = Date.now();
    try {
      const data = await Promise.race([
        this.fetchOne(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error(`${this.name} timeout after ${this.timeout}ms`)), this.timeout)
        )
      ]);
      // 补充公共字段
      const fetchedAt = Date.now();
      return {
        ...data,
        bank: data.bank || this.name,
        bankName: data.bankName || this.displayName,
        product: data.product || this.product,
        fetchedAt,
        isStale: false,
        ok: true,
        error: null,
        latencyMs: fetchedAt - start
      };
    } catch (err) {
      return {
        bank: this.name,
        bankName: this.displayName,
        product: this.product,
        buyPrice: null,
        sellPrice: null,
        midPrice: null,
        change: null,
        changePct: null,
        source: `${this.name}-failed`,
        quoteTime: new Date().toISOString(),
        fetchedAt: Date.now(),
        isStale: true,
        ok: false,
        error: err.message || String(err),
        latencyMs: Date.now() - start
      };
    }
  }

  // 子类必须实现
  async fetchOne() {
    throw new Error('fetchOne() not implemented');
  }
}

module.exports = BaseSource;
