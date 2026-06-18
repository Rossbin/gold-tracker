# 部署指南（超详细 · 跟着点就行）

> 整个流程大约 30~45 分钟。每一步都告诉你**点哪个按钮、填什么内容、看什么反馈**。按顺序操作即可。

---

## 第 0 步：准备 3 样东西

| 准备项 | 怎么拿 | 是否免费 |
|---|---|---|
| **微信小程序 AppID** | 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发管理 → 开发设置 → AppID | 个人/企业均可，免费 |
| **微信开发者工具** | [微信开发者工具.com](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 下载最新稳定版 | 免费 |
| **Node.js 18+** | 本地测试/调试用，部署到云函数可不装 | 免费 |

> ⚠️ **重点**：AppID 不要用"游客模式"或"测试号"，测试号不支持云开发。必须绑定真实的 AppID。

---

## 第 1 步：创建云开发环境（5 分钟）

### 1.1 新建空项目

```
1. 打开微信开发者工具
2. 工具栏右上角点 "+" → "导入项目"
3. 项目目录：选一个空目录（比如桌面新建 gold-tracker-init）
4. AppID：填你的真实 AppID
5. 项目名称：gold-tracker
6. 后端服务：选"微信云开发"
7. 点"确定"
```

### 1.2 开通云开发

```
1. 工具栏左上方 → 点 "云开发" 按钮（云朵图标）
2. 弹窗提示"开通云开发" → 点"开通"
3. 选择套餐："免费版"（每月 1000 次云函数调用 + 2GB 数据库空间，超出按量计费）
4. 实名认证：按提示完成（个人身份证扫一扫）
5. 创建环境：
   - 环境名：gold-tracker-prod
   - 付费：免费版
6. 创建成功后会出现一个环境 ID（形如：gold-tracker-prod-abc123）
```

> 📝 **把环境 ID 完整复制下来**（包括 `gold-tracker-prod-` 前缀和后面那串字符），第 5 步要用。

---

## 第 2 步：导入本项目代码（2 分钟）

### 2.1 关闭临时项目，重新导入

```
1. 微信开发者工具 → 项目 → 关闭刚才的临时项目
2. 工具栏右上角点 "+" → "导入项目"
3. 项目目录：选择 /your-path/gold-tracker/miniprogram  ← 注意是 miniprogram 子目录
4. AppID：填你的真实 AppID
5. 项目名称：gold-tracker
6. 后端服务：选"微信云开发"
7. 点"确定"
```

> ⚠️ **重点**：项目目录必须选 `miniprogram` 这一层，**不是 `gold-tracker` 根目录**。

### 2.2 确认目录结构

导入后，左侧"文件资源管理器"里应该看到：

```
gold-tracker/
├── cloudfunctions/          ← 云函数目录
│   ├── fetchGoldNow/
│   ├── getLatestPrice/
│   └── updateSettings/
├── miniprogram/             ← 实际导入的是这个目录
│   ├── pages/
│   ├── utils/
│   ├── app.js
│   ├── app.json
│   └── sitemap.json
└── ... 其他文件
```

如果 `cloudfunctions/` 没出现，**右键项目根 → "同步云开发目录"**。

---

## 第 3 步：上传 3 个云函数（10 分钟）

> 每个云函数**单独右键上传**，不要整个目录一起传。上传时务必选择"云端安装依赖"。

### 3.1 上传 fetchGoldNow

```
1. 左侧文件树 → 右键 cloudfunctions/fetchGoldNow
2. 菜单里选 "上传并部署：云端安装依赖（不上传 node_modules）"
3. 等待 30~60 秒，右下角会弹"上传成功"
```

### 3.2 上传 getLatestPrice

```
1. 右键 cloudfunctions/getLatestPrice
2. 选 "上传并部署：云端安装依赖（不上传 node_modules）"
3. 等待 20~30 秒
```

### 3.3 上传 updateSettings

```
1. 右键 cloudfunctions/updateSettings
2. 选 "上传并部署：云端安装依赖（不上传 node_modules）"
3. 等待 20~30 秒
```

### 3.4 验证上传成功

```
1. 顶部菜单 → "云开发" → 打开云开发控制台
2. 左侧 → "云函数"
3. 应该看到 3 个函数：fetchGoldNow、getLatestPrice、updateSettings
4. 每个点进去 → "云端测试" → 输入 {} → 点"运行"
   - fetchGoldNow 第一次运行可能失败（"集合不存在"），正常
   - getLatestPrice 应该返回 { ok: true, bankData: [...], ... } 或空数组
   - updateSettings 应该返回 { ok: true, settings: {...} }
```

---

## 第 4 步：配置定时触发器（3 分钟）

> ⚠️ 关键步骤，不配的话云函数不会自动定时抓取。

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
7. 回到"函数配置"页 → 确认触发器状态为"已启用"
```

> **Cron 表达式说明**：`0 0 */5 * * * *` 表示"每 5 分钟的第 0 秒触发一次"。6 位分别是：秒/分/时/日/月/周。

---

## 第 5 步：填环境 ID 到 app.js（1 分钟）

打开 `miniprogram/app.js`，找到：

```js
wx.cloud.init({
  env: 'your-env-id',   // ← 把这里改掉
  traceUser: true
});
```

把 `'your-env-id'` 替换为第 1 步记下的环境 ID（带 `gold-tracker-prod-` 前缀），**必须保留单引号**：

```js
wx.cloud.init({
  env: 'gold-tracker-prod-abc123',   // ← 你的真实环境 ID
  traceUser: true
});
```

保存文件（Ctrl+S）。

---

## 第 6 步：初始化数据库（5 分钟）

### 方法 A：用云函数测试自动建集合（推荐）

```
1. 左侧文件树 → 右键 cloudfunctions/getLatestPrice
2. 菜单里选 "云函数测试"
3. 弹窗里把以下代码粘进去（覆盖默认的 {}）
```

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

for (const name of ['gold_prices', 'gold_settings', 'gold_subscribers', 'gold_extra']) {
  try {
    await db.createCollection(name);
    console.log('created', name);
  } catch (e) {
    console.log(name, e.errMsg || e.message);
  }
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
  console.log('global settings inserted');
} catch (e) {
  console.log('global settings:', e.errMsg || e.message);
}

return { ok: true };
```

```
4. 点"运行"
5. 看到返回 { ok: true } 即可
```

### 方法 B：手动建集合（如果方法 A 失败）

```
1. 云开发控制台 → 左侧 "数据库"
2. 点 "+" → 新建集合
3. 依次创建 4 个集合：
   - gold_prices
   - gold_extra
   - gold_settings
   - gold_subscribers
4. 点进 gold_settings → 添加记录：
   - _id: global
   - refreshInterval: 60
   - notifyThreshold: 1
   - notifyEnabled: false
   - createdAt: <当前时间戳，例如 1718160000000>
   - 保存
5. （可选）点进 gold_prices → "索引管理" → 添加索引：
   - 字段名：bank，方向：升序
   - 字段名：fetchedAt，方向：降序
```

---

## 第 7 步：配置异动推送（可选，但强烈建议）

> 设置页的「异动推送」依赖微信「订阅消息」。不配置也能正常用小程序，只是打开推送开关时会提示模板未配置。

### 7.1 申请订阅消息模板

```
1. 登录 mp.weixin.qq.com → 功能 → 订阅消息
2. 点"添加" → 在"公共模板库"里搜索"价格变动"或"到价提醒"
3. 选一个包含「品种/名称 + 价格 + 涨跌 + 时间」字段的模板 → 添加
4. 添加后会得到一个模板 ID（形如 xXxXxXxX...）→ 复制下来
```

### 7.2 把模板 ID 填进小程序代码

打开 `miniprogram/pages/settings/settings.js`，顶部找到：

```js
const NOTIFY_TMPL_ID = 'YOUR_TEMPLATE_ID';
```

把 `'YOUR_TEMPLATE_ID'` 替换为刚复制的模板 ID。

### 7.3 按实际模板调整云函数字段

打开 `cloudfunctions/fetchGoldNow/index.js`，找到 `checkAndNotify` 函数里的 `cloud.openapi.subscribeMessage.send`。里面的 `data` 字段名（`thing1` / `amount2` / `character_string3` / `time4`）必须和你申请的模板字段一一对应。如果字段名不同，按模板提示修改。

> ⚠️ 微信订阅消息是「一次性」的：用户每授权一次只能收 1 条提醒。设置页提供「续订」按钮，配额用尽后需重新点击授权。

---

## 第 8 步：第一次手动触发抓取（验证流程）

```
1. 左侧文件树 → 右键 cloudfunctions/fetchGoldNow
2. 选 "云函数测试"
3. 输入 {} → 点 "运行"
4. 等待 5~15 秒
5. 应该看到类似返回：
   {
     "ok": true,
     "sources": 10,
     "succeeded": 6,
     "failed": 4,
     "bankData": [...],
     "extraData": [...]
   }
```

> **如果 6-8 个源成功**：恭喜，抓取链路已通。
>
> **如果只有 1-3 个成功**：也是正常的，部分银行接口在云函数环境下可能受 IP/Referer 限制，腾讯源和东财源通常能兜底。
>
> **如果全部失败**：见第 11 步"故障排查"。

---

## 第 9 步：上传小程序体验版（5 分钟）

```
1. 工具栏右上角 → 点 "上传" 按钮
2. 弹窗里：
   - 版本号：1.1.0
   - 项目备注：银行积存金金价监控 + 国际金价 + 异动推送
3. 点 "上传"
4. 等待 30~60 秒，看到 "上传成功"
```

然后在**微信公众平台**（mp.weixin.qq.com）后台：

```
1. 登录 → 版本管理
2. 在"开发版本"下找到刚上传的 1.1.0
3. 点右边的 "提交审核" 旁边的下拉 → "设为体验版"
4. 用微信扫码体验
```

> 如果只是想自己调试，也可以直接在微信开发者工具点"预览"，扫码在真机上查看，无需上传。

---

## 第 10 步：测试主要功能

打开体验版小程序后，按顺序验证：

| # | 操作 | 期望结果 |
|---|------|----------|
| 1 | 启动小程序 | 主页出现 6 个银行卡片 |
| 2 | 等待 5~15 秒 | 至少 1-2 个卡片显示价格（不是"--"） |
| 3 | 点"立即刷新"按钮 | 按钮变 loading，5-10 秒后恢复 |
| 4 | 再次点"立即刷新" | 卡片数据有变化，国际金价卡片出现美元/盎司 + 人民币/克 |
| 5 | 查看银行卡片详情 | 今日最高价、今日最低价、银行买入都有数字 |
| 6 | 进入"设置"页 | 看到当前刷新间隔，默认 60 秒 |
| 7 | 切换到"5 分钟" | 显示"保存成功" |
| 8 | 打开"异动推送"开关 | 弹出微信订阅授权，点"允许"后显示"订阅成功" |
| 9 | 调整"波动阈值"为 0.5% | 选项高亮切换，自动同步到云端 |
| 10 | 查看订阅状态卡片 | 显示"当前可接收提醒 1 条" |
| 11 | 返回主页 | 卡片按新频率继续自动刷新 |

> 如果前 7 步都 OK，核心功能已跑通。如果第 8-10 步异常，请检查订阅消息模板 ID 是否填对。

---

## 第 11 步：故障排查

### 问题 1：上传云函数时卡在"安装依赖"

```
原因：云函数目录里有 node_modules 文件夹被一并上传
解决：
1. 找到对应云函数目录（如 fetchGoldNow/）
2. 删除里面的 node_modules 文件夹
3. 重新上传
```

### 问题 2：小程序调云函数报 "Error: timeout"

```
原因：云函数执行时间超过小程序端默认 6 秒超时
解决：
1. 确认已使用最新 miniprogram/utils/api.js（timeout 已设为 20000）
2. 重新上传小程序
3. 如果仍超时，把 cloudfunctions/fetchGoldNow/config.json 的 timeout 从 20 改为 30
```

### 问题 3：小程序调云函数报 "wx.cloud is not a function"

```
原因：微信开发者工具版本太旧
解决：升级到 1.06.0 以上稳定版
```

### 问题 4：fetchGoldNow 测试报 "Cannot find module 'request-promise'"

```
原因：上传时没选"云端安装依赖"
解决：
1. 右键 cloudfunctions/fetchGoldNow
2. 选"上传并部署：云端安装依赖（不上传 node_modules）"
3. 重新上传
```

### 问题 5：数据库写入失败 "permission denied"

```
原因：云数据库默认权限仅创建者可写
解决：
1. 云开发控制台 → 数据库 → gold_prices
2. 右上角 "权限设置"
3. 改成 "所有用户可读，仅创建者可写"
```

### 问题 6：定时触发器不触发

```
原因：cron 表达式写错 / 未启用
解决：
1. 云开发控制台 → 云函数 → fetchGoldNow → 函数配置
2. 确认触发器状态为"已启用"
3. 确认 Cron 表达式是 0 0 */5 * * * *（6 位）
4. 查看"触发器日志"是否有记录
```

### 问题 7：国际金价显示"暂无数据"

```
原因：gold-api.com 在云函数环境可能失败
解决：
1. 确认已重新上传最新 fetchGoldNow（已加入腾讯财经 COMEX 源）
2. 点小程序"立即刷新"
3. 看云函数日志确认 tencent-comex 源是否成功
```

### 问题 8：银行最高价/最低价显示"--"

```
原因：旧数据没有高/低字段，或该银行源未返回
解决：
1. 点"立即刷新"，新数据会带上高/低
2. 如果刷新后仍为空，查看云函数日志对应银行源是否成功
```

### 问题 9：订阅消息收不到

```
原因：模板未配置 / 用户未授权 / 配额已用完 / 用户拒收
解决：
1. 检查 settings.js 的 NOTIFY_TMPL_ID 是否已替换为真实模板 ID
2. 检查 fetchGoldNow 的 checkAndNotify 中 data 字段名是否与模板一致
3. 在设置页打开开关时，必须弹出授权框并点"允许"
4. 配额用完后，设置页会提示"当前可接收提醒 0 条"，需点"续订"
```

### 问题 10：免费档 1000 次/月不够用

```
按 5 分钟一次计算：约 8640 次/月，会超免费档基础额度

解决（任选）：
A. 把 cron 改成 0 0 */15 * * * *（15 分钟一次）
B. 升级到 9.9 元/月档（月 5 万次）
C. 降低前端轮询频率，减少主动调用
```

---

## 附：关键路径速查

```
📁 项目根目录
/your-path/gold-tracker/
├── miniprogram/          ← 微信开发者工具要导入的目录
├── cloudfunctions/       ← 3 个云函数在这里
│   ├── fetchGoldNow/     ← 主抓取云函数 + 定时触发器 + 异动推送
│   ├── getLatestPrice/   ← 前端读取接口
│   └── updateSettings/   ← 用户设置 + 订阅管理
├── db/init.js            ← 数据库集合初始化
└── local-dev/            ← 本地测试脚本
```

```
📝 关键修改点
1. miniprogram/app.js 第 13 行：env: '你的环境ID'
2. cloudfunctions/fetchGoldNow/config.json：cron 表达式、超时时间
3. miniprogram/pages/settings/settings.js 顶部：NOTIFY_TMPL_ID
4. cloudfunctions/fetchGoldNow/index.js：订阅消息模板字段名
```

---

## 一句话总结

**核心 10 步**：
1. 开通云开发 → 记下 env ID
2. 导入 `miniprogram/` 目录
3. 上传 3 个云函数（选"云端安装依赖"）
4. 配置 fetchGoldNow 定时触发器（`0 0 */5 * * * *`）
5. 改 `app.js` 的 env ID
6. 初始化数据库（4 个集合 + global 设置文档）
7. （可选）配置订阅消息模板并填入 settings.js
8. 跑一次 `fetchGoldNow` 验证抓取
9. 上传小程序体验版
10. 真机测试全部功能

按这个顺序操作，30-45 分钟可以跑通。卡哪一步贴日志来问。
