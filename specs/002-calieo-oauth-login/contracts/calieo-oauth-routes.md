# Contract: Calieo OAuth 登录路由

本功能新增两个面向浏览器（重定向导航，非 JSON API）的 Route Handler，构成 Calieo Authorization Code Flow + PKCE 的应用侧契约。

## `GET /api/auth/calieo/login`

发起登录。

**Query 参数**:

- `lang`（必填）：发起登录时所在的语言（如 `en`），用于回调成功/失败后按原语言重定向。

**行为**:

1. 生成随机 `state`、PKCE `code_verifier`/`code_challenge`（S256）、`nonce`。
2. 通过 Calieo discovery 元数据构造授权 URL（`response_type=code`、`client_id`、`redirect_uri`（指向 `/api/auth/calieo/callback`）、`scope`（至少包含 `openid email profile`）、`state`、`code_challenge`、`code_challenge_method=S256`、`nonce`）。
3. 将 `state`/`code_verifier`/`nonce`/`lang` 写入短有效期的 `HttpOnly` Cookie（`calieo_oauth_state`）。
4. 302 重定向浏览器至 Calieo 授权端点。

**响应**:

- `302 Found` → Calieo 授权端点。
- 若 Calieo discovery 元数据获取失败（服务不可用）：不发起跳转，直接 302 回 `/{lang}/signin?error=calieo_unavailable`，并记录安全事件日志（FR-009、FR-015）。

## `GET /api/auth/calieo/callback`

处理 Calieo 回调。

**Query 参数（由 Calieo 附加）**:

- `code`：授权码（成功时存在）。
- `state`：需与 Cookie 中保存的 `state` 一致。
- `error` / `error_description`：用户拒绝授权或其他错误时存在（成功时不存在）。

**行为与响应**:

| 场景 | 校验/处理 | 结果 |
| ------ | ----------- | ------ |
| `error` 参数存在（用户拒绝授权等） | 记录安全事件日志（FR-015） | 302 → `/{lang}/signin?error=access_denied`，不建立会话（FR-009） |
| `calieo_oauth_state` Cookie 缺失/已过期 | 无法校验，视为非法回调 | 302 → `/{lang}/signin?error=invalid_state`，不建立会话（Edge case：直接访问回调地址） |
| `state` 与 Cookie 中保存值不一致 | 拒绝，记录安全事件日志 | 302 → `/{lang}/signin?error=invalid_state`，不建立会话（FR-002、FR-015） |
| 使用 `code`+`code_verifier` 向 token 端点换取令牌失败（授权码过期/已使用/网络错误） | 记录安全事件日志 | 302 → `/{lang}/signin?error=token_exchange_failed`（FR-009） |
| ID 令牌签名/`iss`/`aud`/`exp`/`nonce` 校验失败 | 记录安全事件日志 | 302 → `/{lang}/signin?error=invalid_id_token`，不建立会话（FR-004、FR-015） |
| ID 令牌声明中缺少 `email` | 记录安全事件日志 | 302 → `/{lang}/signin?error=missing_email`（Edge case） |
| 全部校验通过 | 按 `email` 执行 `ensureUserRow` 查找/创建用户；在 `sessions` 表插入一条新记录（`expiresAt = now + 30d`）；记录安全事件日志（会话创建） | 设置 `session_id` Cookie（`HttpOnly`，生产 `Secure`，`SameSite=Lax`，`maxAge` 与 `expiresAt` 一致），清除 `calieo_oauth_state` Cookie，302 → `/{lang}/console`（FR-005、FR-006、FR-011） |

**安全要求**:

- 所有分支处理完成后必须清除 `calieo_oauth_state` Cookie（一次性使用）。
- 任何校验失败分支均不得设置 `session_id` Cookie、不得写入 `sessions` 表。
- `runtime = "nodejs"`（与仓库现有数据库相关 Route Handler 一致，见 `src/app/api/console/*/route.ts`）。

## 登出（沿用现有路由，非新增 API）

`/{lang}/signout` 页面的 Server Action 改造：除清除现有 Cookie 外，需额外：

1. 读取 `session_id` Cookie（若存在）。
2. 删除 `sessions` 表中对应的这一行（仅这一行，不影响同用户的其他会话，FR-010/FR-014）。
3. 清除 `session_id` Cookie。
