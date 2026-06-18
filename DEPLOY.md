# 部署指南（超详细 · 跟着点就行）

> 整个流程大约 30~45 分钟。每一步都告诉你**点哪个按钮、填什么内容、看什么反馈**。

---

## 第 0 步：准备 3 样东西

| 准备项 | 怎么拿 | 是否免费 |
|---|---|---|
| **微信 AppID** | 登录 mp.weixin.qq.com → 开发管理 → AppID（**个人测试号** `wx****` 即可） | 免费 |
| **微信开发者工具** | 微信开发者工具.com 下载最新稳定版 | 免费 |
| **Node.js 18+** | 部署本地脚本要，本地测试用 | 免费 |

> ⚠️ 重点：**AppID 不要用"游客模式"或"测试号"**，必须用正式的。测试号不支持云开发。

---

## 第 1 步：创建云开发环境（5 分钟）

### 1.1 新建空项目

```
1. 打开微信开发者工具
2. 工具栏右上角点 "+" → "导入项目"
3. 项目目录：选一个**空目录**（比如桌面新建 `gold-tracker-init`）
4. AppID：填你的 AppID
5. 项目名称：gold-tracker
6. 后端服务：选"微信云开发"
7. 点"确定"
```

### 1.2 开通云开发

```
1. 工具栏左上方 → 点 "云开发" 按钮（一个云朵图标）
2. 弹窗会提示"开通云开发" → 点"开通"
3. 选择套餐："免费版"（每月 1000 次云函数调用 + 2GB 数据库）
4. 实名认证：跟着提示走（个人身份证扫一扫）
5. 创建环境：
   - 环境名：gold-tracker-prod
   - 付费：免费版
6. 创建成功后会看到一个**环境 ID**（形如：gold-tracker-prod-abc123）
```

> 📝 **把这个环境 ID 复制下来**（包括 `gold-tracker-prod-` 前缀和后面那串字符），第 5 步要用。

---

## 第 2 步：导入本项目代码（2 分钟）

### 2.1 删除刚才的临时项目，重新导入

```
1. 微信开发者工具 → 项目 → 关闭项目
2. 工具栏右上角 "+" → "导入项目"
3. 项目目录：选 /workspace/gold-tracker/miniprogram  ← 注意是 miniprogram 子目录
4. AppID：填你的 AppID
5. 项目名称：gold-tracker
6. 后端服务：选"微信云开发"
7. 点"确定"
```

> ⚠️ 重点：项目目录必须选 `miniprogram` 这一层，**不是 `gold-tracker` 根目录**。

### 2.2 确认目录结构

导入后，左侧"文件资源管理器"里应该看到：

```
gold-tracker/
├── cloudfunctions/         ← 云函数目录
│   ├── fetchGoldNow/
│   ├── getLatestPrice/
│   └── updateSettings/
├── miniprogram/            ← 实际导入的就是这个
│   ├── pages/
│   ├── utils/
│   ├── app.js
│   ├── app.json
│   └── sitemap.json
└── ...其他文件
```

如果 `cloudfunctions/` 没出现，**右键项目根 → "同步云开发目录"**。

---

## 第 3 步：上传 3 个云函数（10 分钟）

> 每个云函数**单独右键上传**，不是整个目录一起传。

### 3.1 上传 fetchGoldNow

```
1. 左侧文件树 → 右键 cloudfunctions/fetchGoldNow
2. 菜单里选 "上传并部署：云端安装依赖（不上传 node_modules）"
   ⚠️ 一定要选这一项，不要选"不上传 node_modules"那个
3. 弹窗会显示"上传中..."，等待 30~60 秒
4. 上传完成后右下角会弹"上传成功"
```

### 3.2 上传 getLatestPrice

```
1. 右键 cloudfunctions/getLatestPrice
2. "上传并部署：云端安装依赖（不上传 node_modules）"
3. 等待 20~30 秒
```

### 3.3 上传 updateSettings

```
1. 右键 cloudfunctions/updateSettings
2. "上传并部署：云端安装依赖（不上传 node_modules）"
3. 等待 20~30 秒
```

### 3.4 验证上传成功

```
1. 顶部菜单 → "云开发" → 打开云开发控制台
2. 左侧 → "云函数"
3. 应该看到 3 个函数：fetchGoldNow、getLatestPrice、updateSettings
4. 每个点进去 → "云端测试" → 输入 {} → 点"运行"
   - 第一次运行 fetchGoldNow 会失败（"集合不存在"），正常
   - getLatestPrice 应该返回 {ok: true, data: [...]} 或 {ok: true, data: []}
```

---

## 第 4 步：配置定时触发器（3 分钟）

> ⚠️ 关键步骤，不配的话云函数**不会自动跑**。

```
1. 云开发控制台 → 云函数 → 点 fetchGoldNow
2. 上方标签页 → 切到 "函数配置"
3. 滚到页面下方 → "定时触发器" 区域
4. 点 "创建触发器"
5. 弹窗配置：
   - 触发器名称：every5Min
   - 触发周期：自定义
   - Cron 表达式：0 0 */5 * * * *    ← 直接复制粘贴
6. 点 "确定"
7. 回到 "函数配置" 页 → 确认触发器已启用
```

> **Cron 表达式说明**：`0 0 */5 * * * *` 的含义是"每 5 分钟的第 0 秒触发一次"。
> 6 位分别是：秒/分/时/日/月/周。

---

## 第 5 步：填环境 ID 到 app.js（1 分钟）

打开 `miniprogram/app.js`，找到这段代码：

```js
// === 第 13 行附近 ===
wx.cloud.init({
  env: 'your-env-id',   // ← 把这里改掉
  traceUser: true
});
```

把 `'your-env-id'` 替换成第 1 步记下来的环境 ID（带 `gold-tracker-prod-` 前缀）。**必须加单引号**。

```js
// 改完后应该是这样：
wx.cloud.init({
  env: 'gold-tracker-prod-abc123',   // ← 你的真实环境 ID
  traceUser: true
});
```

保存文件（Ctrl+S）。

---

## 第 6 步：初始化数据库（5 分钟）

> 有两种方法，**推荐方法 A**（自动建集合）。

### 方法 A：用云函数自动建集合

```
1. 左侧文件树 → 右键 cloudfunctions/getLatestPrice
2. 菜单里选 "云函数测试"
3. 弹窗里把以下代码粘进去（覆盖默认的 {}）：
```

```js
// 测试代码
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

try {
  await db.createCollection('gold_prices');
  console.log('created gold_prices');
} catch (e) {
  console.log('gold_prices:', e.errMsg || e.message);
}

try {
  await db.createCollection('gold_settings');
  console.log('created gold_settings');
} catch (e) {
  console.log('gold_settings:', e.errMsg || e.message);
}

try {
  await db.createCollection('gold_subscribers');
  console.log('created gold_subscribers');
} catch (e) {
  console.log('gold_subscribers:', e.errMsg || e.message);
}

try {
  await db.collection('gold_settings').add({
    data: {
      _id: 'global',
      refreshInterval: 60,
      notifyThreshold: 1,
      notifyEnabled: false,
      createdAt: Date.now()
    }
  });
  console.log('settings inserted');
} catch (e) {
  console.log('settings:', e.errMsg || e.message);
}

return { ok: true };
```

```
4. 点"运行"
5. 看到返回 {ok: true} 即可
```

### 方法 B：手动建（如果方法 A 失败）

```
1. 云开发控制台 → 左侧 "数据库"
2. 点 "+" → 新建集合
3. 集合名输入 gold_prices → 确认
4. 重复 2-3 步，再建集合 gold_settings 和 gold_subscribers
5. 点进 gold_settings → 添加记录：
   - _id: global
   - refreshInterval: 60
   - notifyThreshold: 1
   - notifyEnabled: false
   - createdAt: <当前时间戳，比如 1718160000000>
   - 保存
6. （可选）点进 gold_prices → "索引管理" → 添加索引：
   - 字段名：bank，方向：升序
   - 字段名：fetchedAt，方向：降序
```

---

## 第 6.5 步：配置异动推送（可选）

> 设置页的「异动推送」依赖微信「订阅消息」。不配置也能正常用小程序，只是打开推送开关时会提示模板未配置。

### 1. 申请订阅消息模板

```
1. 登录 mp.weixin.qq.com → 功能 → 订阅消息
2. 点"添加" → 在"公共模板库"里搜索"价格变动"或"到价提醒"
3. 选一个含「品种/名称 + 价格 + 涨跌 + 时间」字段的模板 → 添加
4. 添加后会得到一个模板 ID（形如 xXxXxXxX...）→ 复制下来
```

### 2. 把模板 ID 填进小程序代码

打开 `miniprogram/pages/settings/settings.js`，顶部找到：

```js
const NOTIFY_TMPL_ID = 'YOUR_TEMPLATE_ID';
```

把 `'YOUR_TEMPLATE_ID'` 替换成上一步的模板 ID。

### 3. 按实际模板调整云函数字段

`cloudfunctions/fetchGoldNow/index.js` 的 `checkAndNotify` 里，`cloud.openapi.subscribeMessage.send` 的 `data` 字段名（`thing1` / `amount2` / `character_string3` / `time4`）要和你申请的模板字段一一对应。字段名不同就按模板提示改一下。

> ⚠️ 微信订阅消息是「一次性」的：用户每授权一次只能收 1 条提醒。设置页提供「续订」按钮，配额耗尽后需重新点击授权。fetchGoldNow 每次抓取后会自动对比上次价格，超过用户设定阈值就推送并扣减 1 条配额。

---

## 第 7 步：第一次手动触发抓取（验证流程）

```
1. 左侧文件树 → 右键 cloudfunctions/fetchGoldNow
2. 选 "云函数测试"
3. 输入 {} → 点 "运行"
4. 等待 5~10 秒
5. 应该看到类似这样的返回：
   {
     "ok": true,
     "count": 6,
     "results": [
       { "bank": "CMB", "sellPrice": 911.5, ... },
       { "bank": "EAST", "sellPrice": 911.5, ... },
       ...
     ]
   }
```

> **如果 6 行全部成功**：恭喜，进入第 8 步。
>
> **如果只有招行/东财成功**（1~2 个）：也是正常的，工/建/中/农/交 在云函数环境下可能受 IP/Referer 限制，后续会被 SGE 兜底。
>
> **如果全部失败**：见第 10 步"故障排查"。

---

## 第 8 步：上传小程序体验版（5 分钟）

```
1. 工具栏右上角 → 点 "上传" 按钮
2. 弹窗里：
   - 版本号：1.0.0
   - 项目备注：银行积存金金价监控
3. 点 "上传"
4. 等待 30~60 秒，看到 "上传成功"
```

然后在**微信公众平台**（mp.weixin.qq.com）后台：

```
1. 登录 → 版本管理
2. 在"开发版本"下找到刚上传的 1.0.0
3. 点右边的 "提交审核" 旁边的下拉 → "设为体验版"
4. 扫码即可体验
```

> ⚠️ 提示：如果不想走审核流程，**直接用微信开发者工具右上角的"预览"扫码**即可在自己手机上看效果，**不需要上传**。这一步是给真机调试用。

---

## 第 9 步：测试主要功能

打开体验版小程序后，按顺序验证：

| # | 操作 | 期望结果 |
|---|------|----------|
| 1 | 启动小程序 | 主页出现 6 个银行卡片 |
| 2 | 等待 5~15 秒 | 至少 1~2 个卡片显示价格（不是"--"） |
| 3 | 点"立即刷新"按钮 | 按钮变 loading 状态，3~8 秒后恢复 |
| 4 | 再次点"立即刷新" | 卡片数据有微小变化（招行价格每分钟变） |
| 5 | 进入"设置"页 | 看到当前刷新间隔（默认 60s） |
| 6 | 切换到 "5 分钟" | 显示"保存成功" |
| 7 | 返回主页 | 卡片继续按 5 分钟节奏自动刷新 |
| 8 | 设置页打开"异动推送"开关 | 弹出微信订阅授权，点"允许"后显示"订阅成功" |
| 9 | 调整"波动阈值"为 0.5% | 选项高亮切换，自动同步到云端 |
| 10 | 查看订阅状态卡片 | 显示"当前可接收提醒 1 条"，按钮变为"续订" |

> 如果前 4 步都 OK，整个项目就**完整跑通了**。

---

## 第 10 步：故障排查（看到再查）

### 问题 1：上传云函数时卡在"安装依赖"

```
原因：云函数目录里有 node_modules 文件夹被一并上传
解决：
1. 找到对应云函数目录（比如 fetchGoldNow/）
2. 删除里面的 node_modules 文件夹（如果存在）
3. 重新上传
```

### 问题 2：小程序调云函数报"wx.cloud is not a function"

```
原因：开发者工具版本太旧
解决：升级到 1.06.0 以上的稳定版
```

### 问题 3：fetchGoldNow 测试报"Cannot find module 'request-promise'"

```
原因：上传时没选"云端安装依赖"
解决：
1. 右键 cloudfunctions/fetchGoldNow
2. 选"上传并部署：云端安装依赖（不上传 node_modules）"
3. 这次一定要看准选项
```

### 问题 4：数据库写入失败"permission denied"

```
原因：云数据库默认权限只允许创建者读写
解决：
1. 云开发控制台 → 数据库 → gold_prices
2. 右上角 "权限设置"
3. 改成 "所有用户可读，仅创建者可写"
```

### 问题 5：定时触发器不触发

```
原因：cron 表达式写错 / 没启用
解决：
1. 云开发控制台 → 云函数 → fetchGoldNow → 函数配置
2. 确认触发器状态是 "已启用"
3. 确认 Cron 表达式是 0 0 */5 * * * *  ← 6 位
4. 看 "触发器日志" 标签页有没有触发记录
```

### 问题 6：6 个银行全部抓不到

```
原因：云函数内访问外网有限制
解决：
1. 云开发控制台 → 云函数 → fetchGoldNow → 日志
2. 看具体报错
3. 90% 的情况是某个源被腾讯云 IP 段屏蔽——可暂时把"备份源逻辑"打开：
   打开 fetchGoldNow/sources/_orchestrator.js
   找到 runAll 函数
   把 banks 数组只保留 [new CMBSource(), new EastMoneySource()]
```

### 问题 7：免费档 1000 次/月不够用

```
按 5 分钟一次计算：每月 8640 次
默认配置会超免费档

解决（任选一个）：
A. 把 cron 改成 0 0 */15 * * * *（15 分钟一次，月 2880 次）—— 免费档是"基础配额" 2 万次，所以其实够用
B. 升级到 9.9 元/月档（月 5 万次）
C. 让前端轮询为主，云函数只兜底
```

---

## 附：关键路径速查

```
📁 项目根目录
/workspace/gold-tracker/
├── miniprogram/          ← 微信开发者工具要导入的目录
├── cloudfunctions/       ← 3 个云函数在这里
│   ├── fetchGoldNow/     ← 主抓取云函数
│   ├── getLatestPrice/   ← 前端读取接口
│   └── updateSettings/   ← 修改刷新频率
└── local-dev/            ← 本地 Node 测试（不需要上传）
```

```
📝 关键修改点
1. miniprogram/app.js 第 13 行：env: '你的环境ID'
2. cloudfunctions/fetchGoldNow/config.json：cron 表达式
```

---

## 一句话总结

**8 个核心步骤**：
1. 开通云开发 → 记下 env ID
2. 导入 `miniprogram/` 目录
3. 右键上传 3 个云函数（**选"云端安装依赖"**）
4. 控制台配定时触发器（`0 0 */5 * * * *`）
5. 改 `app.js` 的 env ID
6. 跑一次 `getLatestPrice` 初始化数据库
7. 跑一次 `fetchGoldNow` 验证抓取
8. 上传体验版 → 扫码测试

按这个顺序操作，30~45 分钟可以跑通。卡哪一步贴日志给我看。
