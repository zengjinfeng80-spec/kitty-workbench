# Kitty 工作台

Kitty 工作台是一款支持待办、记账、生活记录、Excel 导出、JSON 备份和 PWA 安装的个人工作台。账号版增加邮箱 8 位验证码登录、首次本地数据迁移、离线缓存和跨设备同步。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

未填写 Supabase 环境变量时，应用会安全降级为本地模式，原 `kitty-workbench` 数据和全部本地功能保持可用。

## Supabase 配置

1. 创建 Supabase 项目。
2. 在 SQL Editor 按文件名顺序执行 `supabase/migrations/*.sql`。第二个迁移会在数据库层阻止较旧的离线记录覆盖较新的云端版本。
3. 在 Authentication → URL Configuration 添加本地地址和 GitHub Pages 地址。
4. 在 Authentication → Email Templates 将登录模板配置为 8 位 Token 验证码。Supabase 免费项目使用默认邮件服务时不能修改模板，必须先配置自定义 SMTP（或升级套餐）；未配置 SMTP 时，应用仍兼容默认登录链接邮件。
5. 将 Project URL 和 anon public key 写入 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

浏览器端只允许使用 anon key。禁止将 service role key 写入环境文件、GitHub Secrets 或构建产物。

## GitHub Pages 部署

仓库需要配置两个 Actions Secrets：

```bash
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_ANON_KEY
```

推送 `main` 后，`.github/workflows/deploy-pages.yml` 自动构建并部署。

## 邮件发布门禁

Supabase 测试邮件仅用于开发阶段的受限邮箱测试。向任何邮箱公开注册前，必须配置自有域名、自定义 SMTP，并验证发件人身份、送达率、频率限制和垃圾邮件情况。

## 验证

```bash
npm test -- --run
npm audit --audit-level=high
npm run build
```
