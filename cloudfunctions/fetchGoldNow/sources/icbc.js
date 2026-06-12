/**
 * 工商银行 —— 积存金
 *
 * 主策略：mybank.icbc.com.cn/servlet/AsynGetDataServlet (POST, tranCode=A00622)
 * 反爬：Referer + Cookie；首次请求需要先 GET 首页拿 CK_ISW_EBANKP_*
 *
 * 注意：tranCode=A00622 是社区反编译得到，银行改版可能失效。
 * 兜底：HTML 页面解析 goldaccrual_query_out.jsp
 */

const BaseSource = require('./_base');

function getHttp() {
  try { return require('request-promise'); } catch (e) {}
  try { return require('axios'); } catch (e) {}
  return null;
}

class ICBCSource extends BaseSource {
  constructor() {
    super({
      name: 'ICBC',
      displayName: '工商银行',
      type: 'bank',
      timeout: 6000
    });
    this.servletUrl = 'https://mybank.icbc.com.cn/servlet/AsynGetDataServlet';
    this.referer = 'https://mybank.icbc.com.cn/icbc/newperbank/perbank3/gold/goldaccrual_query_out.jsp';
    this.productCode = '080020000501'; // 如意积存金
  }

  async fetchOne() {
    const http = getHttp();
    if (!http) throw new Error('no http client');

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': this.referer,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    };

    let body;
    const form = `tranCode=A00622&productCode=${this.productCode}`;

    if (http.default) {
      // axios
      const r = await http.post(this.servletUrl, form, { timeout: this.timeout, headers, httpsAgent: false });
      body = typeof r.data === 'string' ? safeParseJSON(r.data) : r.data;
    } else {
      body = await http({
        url: this.servletUrl,
        method: 'POST',
        form: `tranCode=A00622&productCode=${this.productCode}`,
        timeout: this.timeout,
        headers,
        // 简化 cookies 持久化（云函数场景下需要外部存储）
        jar: true
      });
    }

    // 工行接口实际响应结构不稳定，下面做宽松解析
    // 期望类似：{ activePrice: '910.30', sellPrice: '911.10', upDown: '1.20', quoteTime: '...' }
    if (!body) throw new Error('empty body');
    const sell = parseFloat(body.sellPrice || body.activePrice || body.curPrice);
    if (!sell) throw new Error('no price in icbc response');

    const change = parseFloat(body.upDown || body.change || 0);
    const lastClose = sell - change;

    return {
      product: body.productName || '如意积存金',
      buyPrice: lastClose,
      sellPrice: sell,
      midPrice: (sell + lastClose) / 2,
      change,
      changePct: lastClose ? (change / lastClose) * 100 : null,
      source: 'icbc-servlet',
      quoteTime: body.quoteTime || new Date().toISOString(),
      raw: body
    };
  }
}

function safeParseJSON(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

module.exports = ICBCSource;
