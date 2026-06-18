# 积存金实时金价追踪小程序

> 基于**微信云开发**的小程序，实时追踪中国六大国有银行积存金金价、国际现货黄金（COMEX）及品牌首饰金价，并支持价格异动订阅提醒。

---

## 一、项目简介

**核心目标**：让用户在微信内一站式查看 招商银行、工商银行、建设银行、中国银行、农业银行、交通银行 的实时积存金买入/卖出价，并对比国际金价与首饰金价，辅助判断购买时机。

**适用场景**：
- 日常关注黄金价格波动
- 准备购买银行积存金或投资黄金
- 希望在金价大幅波动时收到微信通知

---

## 二、功能特性

### 1. 多银行积存金实时报价
- **6 家银行**：招商银行、工商银行、建设银行、中国银行、农业银行、交通银行
- 展示：实时卖出价、银行买入价、当日最高价、当日最低价、涨跌幅、涨跌额
- 价格变动时卡片高亮闪烁提示

### 2. 国际金价参考
- **COMEX 黄金期货**（美元/盎司）
- 自动换算为**人民币/克**
- 日高/日低、实时汇率参考

### 3. 品牌首饰金价
- 周大福、老凤祥、老庙黄金等主流品牌
- 数据来自公开行情网站，可能存在 1-3 天滞后

### 4. 自动刷新与立即刷新
- 云函数**定时触发**：默认每 5 分钟抓取一次
- 小程序端**轮询**：支持 10s / 30s / 60s / 120s / 300s / 600s 切换
- 悬浮**"立即刷新"**按钮：手动强制触发抓取

### 5. 异动推送（微信订阅消息）
- 当银行卖出价在两次抓取间波动超过设定阈值时，通过微信订阅消息提醒
- 阈值可选：0.5% / 1% / 2% / 3%
- 基于微信**一次性订阅消息**，用户每次授权可接收 1 条提醒，配额用尽后可在设置页续订

### 6. 数据持久化与清理
- 云数据库 `gold_prices`：保留银行价格历史
- 云数据库 `gold_extra`：保留国际金价、首饰金价
- 云数据库 `gold_settings`：用户全局设置（刷新频率、阈值等）
- 云数据库 `gold_subscribers`：订阅用户配额管理
- 自动清理 7 天前历史数据，防止数据库膨胀

---

## 三、技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 微信小程序（WXML / WXSS / JavaScript） |
| 后端 | 微信云开发（Cloud Functions） |
| 数据库 | 微信云开发 MongoDB |
| 运行环境 | Node.js 18+（本地测试） / 微信云函数环境（部署） |
| 数据抓取 | 原生 `https` 模块，不依赖 `axios`/`request-promise` |

---

## 四、数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│  微信小程序前端                                                │
│  ├─ 首页：轮询 getLatestPrice，展示银行/国际/首饰金价         │
│  ├─ 立即刷新：调用 fetchGoldNow 强制抓取                       │
│  └─ 设置页：修改 refreshInterval / notifyThreshold / 订阅消息  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  微信云开发                                                    │
│  ├─ getLatestPrice：从 gold_prices / gold_extra 读最新数据      │
│  ├─ fetchGoldNow：并发抓取所有源，写入数据库，检测异动后推送    │
│  ├─ updateSettings：保存用户设置与订阅用户配额                  │
│  └─ 定时触发器：每 5 分钟触发一次 fetchGoldNow                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  数据源                                                        │
│  ├─ 银行源：CMB / ICBC / CCB / BOC / ABC / BCM                 │
│  ├─ 备份源：SGE 官方日 K / 东方财富 AU9999                      │
│  ├─ 国际金价：腾讯财经 COMEX / gold-api.com                     │
│  └─ 首饰金价：今日金价网                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、目录结构

```
gold-tracker/
├── cloudfunctions/                          # 微信云函数
│   ├── fetchGoldNow/                        # 核心：抓取 + 落库 + 异动推送
│   │   ├── index.js
│   │   ├── config.json                      # 云函数超时、定时触发器配置
│   │   ├── package.json
│   │   └── sources/                         # 数据源适配器
│   │       ├── cmb.js                       # 招商银行
│   │       ├── icbc.js                      # 工商银行
│   │       ├── ccb.js                       # 建设银行
│   │       ├── boc.js                       # 中国银行
│   │       ├── abc.js                       # 农业银行
│   │       ├── bcm.js                       # 交通银行
│   │       ├── sge.js                       # 上海黄金交易所
│   │       ├── eastmoney.js                 # 东方财富 AU9999
│   │       ├── gold-api.js                  # 国际金价（gold-api.com）
│   │       ├── tencent.js                   # 国际金价（腾讯财经 COMEX）
│   │       ├── jewelry.js                   # 首饰金价
│   │       ├── _base.js                     # 适配器基类
│   │       ├── _http.js                     # HTTP 工具 + JSONP 解析
│   │       └── _orchestrator.js             # 并发调度器
│   ├── getLatestPrice/                      # 给前端读取最新金价
│   │   ├── index.js
│   │   └── package.json
│   └── updateSettings/                        # 保存用户设置 + 订阅管理
│       ├── index.js
│       └── package.json
├── miniprogram/                             # 微信小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── sitemap.json
│   ├── project.config.json
│   ├── pages/
│   │   ├── index/                           # 首页
│   │   │   ├── index.js
│   │   │   ├── index.wxml
│   │   │   ├── index.wxss
│   │   │   └── index.json
│   │   └── settings/                        # 设置页
│   │       ├── settings.js
│   │       ├── settings.wxml
│   │       ├── settings.wxss
│   │       └── settings.json
│   └── utils/
│       ├── api.js                           # 云函数调用封装
│       └── format.js                        # 价格/时间格式化
├── db/init.js                               # 数据库初始化逻辑
├── local-dev/                               # 本地测试脚本
│   ├── test-fetcher.js
│   ├── test-single.js
│   └── test-apis.js
├── DEPLOY.md                                # 详细部署指南
└── README.md                                # 本文件
```

---

## 六、本地测试（无需云开发环境）

```bash
# 进入项目根目录
cd /workspace/gold-tracker

# 安装本地测试依赖（可选，部分测试脚本已改用原生 https）
npm install

# 测试单个数据源
node local-dev/test-single.js cmb
node local-dev/test-single.js icbc
node local-dev/test-single.js tencent
node local-dev/test-single.js gold-api

# 全量抓取测试
node local-dev/test-fetcher.js
```

**预期结果**：
- ✅ 腾讯财经（tencent）/ 东方财富（eastmoney）/ 招行（cmb）：通常能成功
- ⚠️ gold-api.com：在部分网络环境（如云函数）可能 `socket hang up`，已用腾讯源作为互备
- ⚠️ 工行/建行/中行/农行/交行：依赖东财代理或银行接口；本地 Node 22 可能因 TLS/SSL 策略失败，部署到微信云函数后通常能通

> 本地测试只要 1-2 个核心源成功，就说明代码逻辑正确；部署到云函数后，腾讯云内网 + 微信环境会大幅提升成功率。

---

## 七、快速部署（极简版）

1. 注册微信小程序，获取 AppID
2. 微信开发者工具 → 新建项目 → 导入 `miniprogram/` 目录 → 开启云开发
3. 创建云开发环境，记下 **环境 ID**
4. 修改 `miniprogram/app.js` 中的 `env: 'your-env-id'`
5. 右键分别上传 `cloudfunctions/fetchGoldNow`、`getLatestPrice`、`updateSettings`（选择"云端安装依赖"）
6. 在控制台为 `fetchGoldNow` 配置定时触发器 `0 0 */5 * * * *`
7. 初始化数据库（跑一次 `getLatestPrice` 测试或手动建集合）
8. （可选）配置订阅消息模板并填入 `settings.js` 的 `NOTIFY_TMPL_ID`
9. 上传小程序 → 设为体验版或提交审核

**更详细、带截图指引的部署步骤见 [DEPLOY.md](./DEPLOY.md)。**

---

## 八、关键配置点

| 文件 | 配置项 | 说明 |
|---|---|---|
| `miniprogram/app.js` | `env: 'your-env-id'` | 必填，替换为实际云开发环境 ID |
| `cloudfunctions/fetchGoldNow/config.json` | `triggers[].config` | 定时触发周期，默认每 5 分钟 |
| `miniprogram/pages/settings/settings.js` | `NOTIFY_TMPL_ID` | 如需异动推送，填入小程序后台申请的订阅消息模板 ID |
| `cloudfunctions/fetchGoldNow/index.js` | `checkAndNotify` 的 `data` 字段 | 按实际订阅消息模板字段名调整 |
| `miniprogram/app.json` | `pages` / `window` | 页面路由与导航栏样式 |

---

## 九、故障排查速查

| 现象 | 原因 | 解决 |
|---|---|---|
| 小程序报 `Error: timeout` | 前端调用云函数默认 6 秒超时 | 已修复：统一设置 `timeout: 20000`，重新上传小程序即可 |
| 国际金价显示"暂无数据" | gold-api.com 在云函数环境被限 | 已修复：增加腾讯财经 COMEX 源作为互备，重新上传 `fetchGoldNow` 后点"立即刷新" |
| 银行最高/最低价显示 `--` | 旧数据没 high/low 字段 | 新抓取数据会带上；同时前端已增加兜底，不再显示空白 |
| 云函数上传卡在"安装依赖" | 本地有 `node_modules` 干扰 | 删除对应云函数目录下的 `node_modules` 后重新上传 |
| `fetchGoldNow` 全部失败 | 网络/IP 被数据源屏蔽 | 云开发控制台 → 云函数 → `fetchGoldNow` → 日志，查看具体错误 |
| 订阅消息收不到 | 模板 ID 未配置 / 用户未授权 / 配额已用完 | 检查 `settings.js` 的 `NOTIFY_TMPL_ID`；确保用户打开开关时点了"允许"；配额用尽后需续订 |
| 免费档云函数额度不足 | 每 5 分钟触发约 8640 次/月 | 把 `config.json` 的 cron 改为 `0 0 */15 * * * *`（15 分钟一次），或升级到付费档 |

---

## 十、免责声明

本系统数据来自公开行情源（含银行官网、东方财富、腾讯财经、gold-api.com、今日金价网等），**仅供个人参考与学习**，不构成任何投资建议。实际成交价格、手续费、买卖规则以各银行柜台及官方渠道为准。

---

## 十一、开源许可

MIT License
