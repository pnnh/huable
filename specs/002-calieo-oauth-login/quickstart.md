# Quickstart: 通过 Calieo 实现 OAuth2/OIDC 登录（验证指南）

本指南用于端到端验证本功能，不包含实现代码，仅列出前置条件、运行步骤与预期结果。详细契约见 [contracts/calieo-oauth-routes.md](./contracts/calieo-oauth-routes.md)，数据模型见 [data-model.md](./data-model.md)。

## 前置条件

1. 在 Calieo（`https://portal.calieo.xyz`）注册应用，获得 `CALIEO_CLIENT_ID`、`CALIEO_CLIENT_SECRET`，并将回调地址注册为：
   - 本地：`http://localhost:7500/api/auth/calieo/callback`
   - 生产：`https://<生产域名>/api/auth/calieo/callback`
2. 在 `.env.local`（开发）与生产环境密钥（Cloudflare Workers Secrets）中配置：
   - `CALIEO_CLIENT_ID`
   - `CALIEO_CLIENT_SECRET`
   - `NEXT_PUBLIC_BASE_URL`（用于构造 `redirect_uri`）
3. 执行数据库迁移，确保本地 `sessions` 表已创建：

   ```bash
   pnpm db:migrate
   ```

## 场景一：开发环境同时保留模拟登录与 Calieo 登录（对应 User Story 2）

```bash
pnpm dev
```

1. 打开 `http://localhost:7500/en/signin`。
2. **预期**：页面同时展示"邮箱/用户名模拟登录"表单与"通过 Calieo 登录"按钮。
3. 使用模拟登录表单提交任意邮箱 → **预期**：与改造前行为一致，成功跳转 `/en/console`。
4. 退出登录（`/en/signout`），重新访问 `/en/signin`，点击"通过 Calieo 登录" → 在 Calieo 完成登录并授权 → **预期**：跳转回站点并进入 `/en/console`，显示的用户信息来自 Calieo 返回的 `email`/`name` 声明。

## 场景二：生产构建下仅展示 Calieo 登录（对应 User Story 1）

```bash
pnpm build && NODE_ENV=production pnpm start
```

1. 打开 `/en/signin`。
2. **预期**：页面只展示"通过 Calieo 登录"按钮，不出现模拟登录表单，也不显示"访问被拒绝"的旧提示（该提示应仅在完全未配置任何登录方式时出现，本功能上线后不再触发）。
3. 完成一次 Calieo 登录 → **预期**：进入 `/en/console`；检查浏览器 Cookie，只存在不透明的 `session_id`，不包含任何邮箱/用户名等可读信息。

## 场景三：多设备会话与登出隔离（对应 Clarifications：多会话/登出隔离）

1. 使用两个不同浏览器（或一个正常窗口 + 一个隐私窗口）分别完成 Calieo 登录，均能访问 `/en/console`。
2. 在浏览器 A 上访问 `/en/signout` 并确认登出。
3. **预期**：浏览器 A 再次访问 `/en/console` 被重定向至 `/en/signin`；浏览器 B 仍可正常访问 `/en/console`（SC-006）。

## 场景四：异常登录路径不建立会话（对应 Edge Cases / SC-003）

逐一验证以下路径均不产生有效 `session_id` Cookie，且不能进入 `/en/console`：

- 在 Calieo 授权页面点击"拒绝"/取消 → 回到 `/en/signin` 并显示错误提示。
- 直接访问 `/api/auth/calieo/callback?state=invalid`（不带合法的 `calieo_oauth_state` Cookie）→ 回到 `/en/signin` 并显示错误提示。
- （如条件允许）使用已使用过的授权码重放回调请求 → 拒绝，回到 `/en/signin`。

## 部署侧建议（速率限制，参考 [research.md](./research.md) 决策 6，非本功能代码交付物）

建议在 Cloudflare Dashboard 为 `/api/auth/calieo/login` 与 `/api/auth/calieo/callback` 配置 WAF Rate Limiting 规则（例如：同一 IP 每分钟不超过 N 次请求），以防御暴力破解/滥用；该配置不属于本功能代码范围，仅作运维参考。

## 验证通过标准

以上四个场景全部符合预期，即视为本功能实现满足 spec.md 的 Success Criteria（SC-001 ～ SC-006）。
