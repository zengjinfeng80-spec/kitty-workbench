# Kitty 工作台账号登录与云同步实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 Kitty PWA 增加邮箱 8 位验证码登录、旧数据确认迁移、离线缓存、跨设备同步和可部署的 Supabase 数据库权限。

**Architecture:** 现有页面继续消费统一的 `data/setData` 接口；新增认证控制器、IndexedDB 仓库和同步引擎，将账号与云端细节隔离。Supabase 使用统一记录表和 RLS；未配置 Supabase 时应用保持完整本地模式。

**Tech Stack:** React、Vite、Supabase JS、IndexedDB、Vitest、GitHub Pages、Supabase PostgreSQL/RLS。

## Global Constraints

- 不改变浅蓝云朵熊工作台。
- 未登录用户和升级前的 `kitty-workbench` 本地数据必须继续可用。
- 任何本地旧记录只有在用户点击“确认上传并合并”后才能上传。
- 同步失败、离线或登录失败不得清空本地数据。
- 冲突采用最后修改时间优先；删除使用软删除。
- 浏览器只能使用 anon key，service role key 禁止进入前端和仓库。
- 正式公开注册前必须配置自定义 SMTP；开发阶段只验证受限测试邮箱。

---

### Task 1: 可测试的数据转换和同步规则

**Files:**
- Create: `src/sync/data-model.js`
- Create: `src/sync/data-model.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `MODULE_FIELDS`、`countLocalRecords(data)`、`toCloudRecords(data, context)`、`mergeRecordSets(local, remote)`、`recordsToWorkbench(records, defaults)`。

- [ ] **Step 1: 添加 Vitest 和数据模型失败测试**

测试固定 UUID 转换、模块计数、重复迁移稳定性、较新版本胜出和软删除过滤。

- [ ] **Step 2: 运行 `npm test -- --run`，确认测试因模块缺失失败**

Expected: FAIL，提示无法导入 `src/sync/data-model.js`。

- [ ] **Step 3: 实现纯函数数据模型**

稳定 UUID 使用 Web Crypto SHA-256 计算 `userId + recordType + legacyId`；记录结构为 `{ id, user_id, record_type, payload, created_at, updated_at, deleted_at, migration_id, device_id }`。

- [ ] **Step 4: 运行测试并通过**

Run: `npm test -- --run`
Expected: PASS。

### Task 2: 本地账号缓存与离线队列

**Files:**
- Create: `src/sync/indexed-db.js`
- Create: `src/sync/indexed-db.test.js`
- Create: `src/sync/device.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `openWorkbenchDb()`、`loadAccountRecords(userId)`、`saveAccountRecords(userId, records)`、`enqueueChanges(userId, records)`、`readPendingChanges(userId)`、`removePendingChanges(userId, ids)`、`getDeviceId()`。

- [ ] **Step 1: 使用 `fake-indexeddb` 编写账号隔离和队列持久化测试**

测试账号 A 无法读到账号 B 的缓存，刷新数据库连接后待同步队列仍存在。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sync/indexed-db.test.js`
Expected: FAIL，提示实现模块缺失。

- [ ] **Step 3: 用原生 IndexedDB 实现三个 object store**

`records` 主键 `[userId,id]`，`queue` 主键 `[userId,id]`，`metadata` 主键 `key`；所有 API 返回 Promise。

- [ ] **Step 4: 运行全部测试并通过**

Run: `npm test -- --run`
Expected: PASS。

### Task 3: Supabase 客户端、数据库和同步引擎

**Files:**
- Create: `src/supabase/client.js`
- Create: `src/sync/sync-engine.js`
- Create: `src/sync/sync-engine.test.js`
- Create: `supabase/migrations/202608060001_account_sync.sql`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 和 Task 2 的记录、合并与队列 API。
- Produces: `isSupabaseConfigured`、`supabase`、`createSyncEngine({ client, userId, deviceId })`，引擎提供 `pull()`、`push()`、`sync()`、`migrate(data)`。

- [ ] **Step 1: 编写模拟 Supabase 查询链的同步失败测试**

验证 pull→merge→push 顺序、失败项保留在队列、成功项移除、重复迁移使用 upsert。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sync/sync-engine.test.js`
Expected: FAIL。

- [ ] **Step 3: 实现惰性 Supabase 配置与同步引擎**

环境变量缺失时 `isSupabaseConfigured === false` 且不创建网络客户端。迁移 SQL 创建 `workbench_records`、`migration_batches`、索引、更新时间触发器和 `auth.uid() = user_id` 的完整 RLS 策略。

- [ ] **Step 4: 运行全部测试、构建和 SQL 静态检查**

Run: `npm test -- --run && npm run build && rg -n "enable row level security|auth.uid\(\) = user_id" supabase/migrations/*.sql`
Expected: 测试与构建通过，两个表均命中 RLS。

### Task 4: 登录、迁移和同步界面

**Files:**
- Create: `src/account/use-account-sync.js`
- Create: `src/account/LoginDialog.jsx`
- Create: `src/account/MigrationDialog.jsx`
- Create: `src/account/AccountSyncCard.jsx`
- Modify: `src/main.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `supabase` 和 `createSyncEngine()`。
- Produces: `useAccountSync({ localData, setLocalData, defaults, notify })` 返回 `{ session, configured, status, pendingCount, lastSyncedAt, login, verifyOtp, resendOtp, signOut, syncNow, migration, confirmMigration, dismissMigration }`。

- [ ] **Step 1: 将当前本地持久化保留为访客数据源**

现有 `kitty-workbench` 的读取、写入和 JSON 备份恢复保持不变；账号 hook 只在存在有效 session 后切换账号缓存。

- [ ] **Step 2: 实现邮箱与 8 位验证码对话框**

邮箱必填且使用浏览器邮箱校验；验证码只接受 8 位数字；发送后启动 60 秒倒计时；所有错误显示中文且不输出 token。

- [ ] **Step 3: 实现迁移对话框和设置页账号卡片**

迁移对话框显示七个模块数量，只有“确认上传并合并”触发网络写入；账号卡片显示脱敏邮箱、同步状态、最后同步、立即同步和退出登录。

- [ ] **Step 4: 接入现有页面的数据接口**

登录后变更先写本地账号缓存并入队，访客仍写 `kitty-workbench`；网络 `online`、会话恢复和手动按钮触发同步。

- [ ] **Step 5: 构建并检查本地降级**

Run: `npm test -- --run && npm run build`
Expected: 无环境变量时构建通过，设置页显示“云同步尚未配置”，其他功能正常。

### Task 5: Supabase 项目与 Pages 部署

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`（若仓库没有则创建）

**Interfaces:**
- Consumes: `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
- Produces: 可访问的 GitHub Pages PWA 和已执行 RLS 的 Supabase 项目。

- [ ] **Step 1: 创建或选择 Supabase 项目并执行迁移 SQL**

验证 `workbench_records`、`migration_batches` 已创建且 RLS 开启；启用 Email OTP 数字验证码模板。

- [ ] **Step 2: 配置本地环境与 GitHub Actions Secrets**

本地 `.env.local` 写入 URL 和 anon key；GitHub Secrets 使用 `gh secret set VITE_SUPABASE_URL` 和 `gh secret set VITE_SUPABASE_ANON_KEY`，不在终端输出密钥值。

- [ ] **Step 3: 更新 Pages 构建注入变量**

构建步骤通过 `env` 读取两个 Secrets；README 记录 Supabase、SMTP 发布门禁、SQL 执行和本地启动方式。

- [ ] **Step 4: 提交并推送部署**

Run: `git diff --check && npm test -- --run && npm audit --audit-level=high && npm run build`
Expected: 全部通过；随后提交相关文件并推送 `main`。

### Task 6: 端到端验收

**Files:**
- No source changes unless verification finds an in-scope defect.

**Interfaces:**
- Consumes: 已部署 Pages 与 Supabase 测试项目。

- [ ] **Step 1: 验证旧数据升级不丢失**

在部署前写入 `kitty-workbench` 测试记录，刷新新版后确认记录仍可见且登录前无上传请求。

- [ ] **Step 2: 验证邮箱 OTP 和首次迁移**

使用受限测试邮箱登录；确认取消迁移不上传，重新发起后成功迁移，重复迁移不产生重复记录。

- [ ] **Step 3: 验证双设备、冲突与离线**

两个隔离浏览器上下文登录同一账号；验证新增、修改、软删除、离线队列和最后修改时间优先。

- [ ] **Step 4: 验证回归和响应式**

验证 Excel、JSON、PWA 更新提示，检查控制台错误和 390×844 横向溢出。

- [ ] **Step 5: 核对部署状态**

Run: `gh run list --workflow deploy-pages.yml --limit 1`
Expected: 最新运行 `completed success`，线上页面加载新账号入口。
