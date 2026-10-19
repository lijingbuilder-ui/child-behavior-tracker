# 儿童行为记录（微信小程序 MVP）

使用微信云开发的 ABC（前因 Antecedent、行为 Behavior、后果 Consequence）行为记录工具。支持：

- 最长 60 秒语音输入与腾讯云一句话识别
- 混元模型提取 ABC、行为类别和强度
- 保存前人工确认和修改
- 按 OpenID 隔离的行为时间线
- 本周每日次数、类别和平均强度统计
- 云端原始录音默认立即删除；客户端也在请求结束后再次清理

> 本工具用于记录和观察，不提供医疗、心理或教育诊断。涉及儿童安全风险时应联系专业人员。

## 目录

```text
miniprogram/                  小程序页面与客户端逻辑
cloudfunctions/behaviorApi/  鉴权、转写、AI 提取、存储和统计
tests/                        Node.js 单元测试与项目完整性测试
database.rules.json           禁止客户端直连数据库的安全规则
docs/PRIVACY.md               数据和隐私说明
```

## 快速开始

### 1. 准备服务

1. 在微信公众平台注册小程序并开通“云开发”。
2. 在腾讯云开通**语音识别（一句话识别）**和**混元大模型**。
3. 建议创建仅具有上述服务调用权限的子账号 API 密钥，不要使用主账号密钥。

### 2. 导入与配置

1. 用微信开发者工具导入仓库根目录。
2. 将 `project.config.json` 中的 `appid` 从 `touristappid` 改为真实 AppID。
3. 如需指定环境，在 `miniprogram/config.js` 填写 `cloudEnv`；留空则使用当前默认环境。
4. 在云开发数据库创建集合 `behavior_records`。
5. 将 `database.rules.json` 中的规则部署到云环境。客户端读写均被禁止，数据只经云函数访问。
6. 为 `behavior_records` 创建两个复合索引：
   - `_openid` 升序、`occurredAt` 降序
   - `_openid` 升序、`occurredAt` 升序

### 3. 配置并部署云函数

在云函数 `behaviorApi` 的环境变量中设置：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `TENCENTCLOUD_SECRETID` | 是 | 子账号 SecretId |
| `TENCENTCLOUD_SECRETKEY` | 是 | 子账号 SecretKey |
| `TENCENTCLOUD_REGION` | 否 | 默认 `ap-shanghai`（混元客户端使用广州默认值） |
| `HUNYUAN_MODEL` | 否 | 默认 `hunyuan-lite` |
| `KEEP_RECORDINGS` | 否 | 仅明确设为 `true` 才保留录音，不建议开启 |

在开发者工具中右键 `cloudfunctions/behaviorApi`，选择“上传并部署：云端安装依赖”。运行时选择 Node.js 18 或更高版本，超时设置为 60 秒。

密钥只能放在云函数环境变量，严禁写入小程序代码或提交到 Git。若只录入文字且未配置密钥，系统仍会生成待人工补全的降级草稿；语音转写必须配置语音识别密钥。

### 4. 本地验证

本地无需安装依赖即可运行核心测试：

```bash
npm test
npm run check
```

云函数依赖由开发者工具部署时安装。如需本地调试云函数：

```bash
cd cloudfunctions/behaviorApi
npm install
```

## 使用流程

1. 在“记录”页填写匿名称呼。
2. 录音或输入文字描述；尽量按“之前发生什么—具体做了什么—之后发生什么”叙述。
3. 等待转写和 AI 整理。
4. 在“人工确认”页逐项核对 ABC、类别和强度后保存。
5. 在“时间线”和“周统计”查看记录与趋势。

AI 不会直接写入数据库。即使模型返回格式错误，也只会产生明确标注“请人工补充”的草稿。

## 数据模型

`behavior_records` 文档包含：

- `_openid`：云函数从微信上下文取得的用户标识
- `childAlias`：匿名称呼，最长 20 字
- `transcript`：确认后的文字，最长 1000 字
- `abc`：`antecedent`、`behavior`、`consequence`、`category`、`intensity`
- `occurredAt`、`confirmedAt`、`createdAt`：时间字段

查询始终带 `_openid` 条件。客户端不能直接读写集合，也不能提交或覆盖 `_openid`。

## 上线前检查

- 在公众平台补充麦克风用途说明、隐私保护指引和用户协议。
- 使用最小权限子账号并定期轮换 API 密钥。
- 确认数据库规则和复合索引已部署。
- 在真机验证录音授权、弱网失败和云文件清理。
- 根据当地法规确定儿童数据的监护人同意、保存期限和删除流程。

详见 [隐私说明](docs/PRIVACY.md)。
