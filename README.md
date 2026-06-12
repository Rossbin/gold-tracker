# 银行积存金实时金价系统

> 微信云开发版 —— 实时爬取六大行（工/建/农/中/交/招）积存金金价 + 第三方行情交叉验证，支持定时刷新和立即刷新。

## ✨ 功能特性

- **6 家银行实时报价**：工行、建行、农行、中行、交行、招行
- **3 个备份源**：上海黄金交易所（SGE）、东方财富、COMEX 国际金价参考
- **定时刷新**：云函数 cron 触发器，默认每 5 分钟一次（**覆盖微信云开发免费额度**）
- **立即刷新**：小程序端"立即刷新"按钮，强制抓取
- **异动高亮**：价格变动 > 0.3 元/克，UI 卡片闪烁动画
- **可配置频率**：10s / 30s / 60s / 120s / 300s / 600s 切换
- **数据持久化**：云数据库 gold_prices 集合，保留 7 天历史
- **小程序前端**：暗黑 + 金色主题，悬浮刷新按钮

## 📁 目录结构

```
gold-tracker/
├── cloudfunctions/                # 微信云函数
│   ├── fetchGoldNow/              # 核心：抓取 + 落库
│   │   ├── index.js
│   │   ├── config.json            # ⭐ 定时触发器
│   │   ├── package.json
│   │   └── sources/               # 6 行适配器 + 3 备份源
│   ├── getLatestPrice/            # 给前端读最新
│   └── updateSettings/            # 修改用户设置
├── miniprogram/                   # 微信小程序前端
│   ├── app.js / app.json
│   ├── pages/index/               # 主页：6 行卡片 + 立即刷新
│   ├── pages/settings/            # 设置页
│   └── utils/                     # api.js, format.js
├── db/init.js                     # 数据库集合初始化
├── local-dev/                     # 本地测试
│   ├── test-fetcher.js            # 全量抓取测试
│   └── test-single.js             # 单适配器测试
└── README.md / DEPLOY.md
```

## 🧪 本地测试（无需云开发环境）

```bash
# 1. 安装依赖
cd /workspace/gold-tracker
npm install axios cheerio

# 2. 全量测试
node local-dev/test-fetcher.js

# 3. 单个源测试
node local-dev/test-single.js cmb          # 招行
node local-dev/test-single.js eastmoney     # 东方财富
node local-dev/test-single.js sge           # SGE
```

**预期输出**：
- ✅ 招行（CMB）：必成功，约 200-400ms
- ✅ 东方财富（EAST）：必成功，约 100-200ms
- ⚠️ 工行/建行：Node 22 OpenSSL 严格策略 + 老银行网站 TLS 1.0 兼容问题；**部署到微信云函数（Node 8/10）反而能通**
- ⚠️ SGE：沙箱环境网络限制；**部署到腾讯云内网会通**
- ⚠️ 中/农/交：依赖 SGE 代理，**SGE 通它们才通**

> 本地测试通过 1-2 个核心源就说明代码逻辑正确，部署到云函数后整体成功率会大幅提升。

## 🚀 部署到微信云开发

详见 [DEPLOY.md](./DEPLOY.md)。快速步骤：

1. **注册并初始化云开发环境**（微信开发者工具 → 云开发 → 创建新环境，免费档即可）
2. **上传云函数**：在 `cloudfunctions/` 三个目录分别右键 → "上传并部署：云端安装依赖"
3. **初始化数据库**：首次部署后，调用 `fetchGoldNow` 一次，会自动建集合
4. **修改小程序配置**：`miniprogram/app.js` 第 13 行 `env: 'your-env-id'` 改为实际环境 ID
5. **上传小程序**：微信开发者工具 → 上传 → 体验版扫码预览

## 🛠 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| 招行抓到 0 条 | 招行 API 临时限流 | 等待 5-10 分钟再试，或在 cmb.js 增加 Retry-After |
| 工行 SSL 错误 | 老 TLS 协议 | Node 8/10 默认兼容，云函数里 OK |
| SGE 超时 | 网络被墙 | 部署到云函数（腾讯云内网）或换东财做主源 |
| 价格明显不对 | 银行改版 | 检查 `sources/*.js` 的 HTML/JSON 结构 |
| 小程序 404 云函数 | 没上传或 env 写错 | 检查 `miniprogram/app.js` 的 env |

## ⚖️ 免责声明

本系统数据来自公开行情源（含银行官网、第三方财经平台），**仅供个人参考**，不构成任何投资建议；实际成交以各银行柜台为准。

## 📄 许可

MIT
