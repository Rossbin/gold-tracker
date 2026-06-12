/**
 * 云函数 HTTP 工具 —— 使用原生 https 模块
 * 不依赖 axios/request-promise，云函数环境必备
 */

const https = require('https');
const http = require('http');

/**
 * 发送 HTTP GET 请求，返回 Promise
 * @param {string} url - 完整 URL
 * @param {object} opts - { timeout: 毫秒, headers: {} }
 */
function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const mod = isHttps ? https : http;

    const timeout = opts.timeout || 5000;
    let data = '';

    const req = mod.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        ...opts.headers
      }
    }, (res) => {
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { resolve(data); });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

    req.setTimeout(timeout);
    req.end();
  });
}

/**
 * JSONP 解析：提取 jQuery_cb({...}) 中的 JSON
 */
function parseJSONP(body) {
  if (!body || typeof body !== 'string') return body;
  const m = body.match(/jQuery_cb\s*\((.*)\)/s) || body.match(/^[^(]*\((.*)\)$/s);
  if (m) {
    try { return JSON.parse(m[1]); } catch (e) {}
  }
  // 尝试直接解析
  try { return JSON.parse(body); } catch (e) {}
  return body;
}

module.exports = { fetch, parseJSONP };
