# Research: 通过 Calieo 实现 OAuth2/OIDC 登录

## 1. OIDC 客户端库选型

**Decision**: 使用 `oauth4webapi` 实现 Authorization Code Flow + PKCE，通过 Calieo 的 OIDC discovery 文档（`https://portal.calieo.xyz/.well-known/openid-configuration`）动态获取 `authorization_endpoint`、`token_endpoint`、`jwks_uri` 等元数据，并以 confidential client（`CALIEO_CLIENT_ID`/`CALIEO_CLIENT_SECRET`）方式完成令牌交换与 ID 令牌校验（签名、`iss`、`aud`、`exp`、`nonce`）。

**Rationale**: `oauth4webapi` 零运行时依赖、基于标准 Web Crypto API（`globalThis.crypto`），在 Cloudflare Workers（`nodejs_compat` 已开启）与本地 Node.js 开发环境下行为一致；是用户在需求中明确指定的库，且是 Auth.js 团队为边缘运行时推荐的底层实现。

**Alternatives considered**:

- **Auth.js / NextAuth.js**：功能更全（内置多种 Provider、session/adapter 抽象），但历史上在 Cloudflare Workers/OpenNext 环境下存在兼容性问题，且会引入远超本功能所需的配置面（adapters、providers、callbacks 体系），与"最小必要实现"原则冲突 — 拒绝。
- **手写 `fetch` 直接调用 token 端点**：实现量小，但容易在 PKCE、state 校验、JWKS 验签等安全细节上出错，重新发明轮子且审计成本高 — 拒绝。

## 2. 登录请求临时状态（state / PKCE / nonce）的存储方式

**Decision**: 在发起登录时，将 `state`、PKCE `code_verifier`、`nonce` 一起写入一个短生命周期（如 10 分钟）的 `HttpOnly` Cookie（`calieo_oauth_state`，值为 JSON 后签名或直接依赖 `HttpOnly`+`Secure`+短期限保护，不落库）；回调时读取该 Cookie 完成校验后立即清除。

**Rationale**: 这些数据仅在"发起登录 → 用户跳转 Calieo → 回调"这一次浏览器往返内有效，天然与浏览器会话绑定，使用 Cookie 无需额外的数据库读写，性能与实现复杂度最优；缺点（多标签页并发发起登录时后一次会覆盖前一次的 Cookie）可接受，因为 FR-002/FR-010 均以"最近一次登录尝试"为校验基准。

**Alternatives considered**:

- **服务端表/KV 存储 pending 请求**：可支持多标签页并发登录，但代价是新增一张几乎不需要查询历史的表，且需要额外的过期清理逻辑 — 拒绝（超出必要范围）。

## 3. 生产环境会话存储与身份校验路径

**Decision**: 新增 `sessions` 表（服务端存储），浏览器仅保存不透明会话 ID Cookie（`session_id`，`HttpOnly`、生产环境 `Secure`、`SameSite=Lax`、有效期 30 天，与 FR-013 的固定有效期一致）。`src/lib/auth.ts` 的 `getCurrentUser`/`isAuthenticated` 改为：优先按 `session_id` 查 `sessions` 表（校验未过期），命中则关联 `users` 表返回身份；生产环境完全移除对 `CF-Access-Jwt-Assertion` 请求头的读取与信任（对应 FR-012）。开发环境保留现有 `dev_user_email`/`dev_user_name` 模拟登录 Cookie 路径，与新的 `session_id` 路径并存（先检查会话 Cookie，找不到再回退到 dev 模拟登录 Cookie，与现状顺序保持兼容）。

**Rationale**: 服务端会话存储是本轮 Clarify 中用户明确选定的方案，天然支持"随时使某个会话失效"（FR-011）与"同一用户多会话并存"（FR-014）；相比无状态签名 Cookie，更符合可随时吊销、可审计的安全诉求，且与仓库现有 Drizzle/D1 技术栈一致，无需引入新的基础设施。

**Alternatives considered**:

- **应用自签名 JWT/HMAC Cookie（无状态）**：无需数据库查询，扩展性更好，但无法随时吊销单个会话（只能等待过期或维护黑名单，等价于退化为有状态方案）— 已在 Clarify 阶段被用户否决。

## 4. 会话表数据模型设计

**Decision**: `sessions` 表字段：`id`（主键，复用 `createId()` 生成的 base58 uuidv7，作为 Cookie 值）、`userId`（外键 → `users.id`，`onDelete: cascade`）、`createdAt`、`expiresAt`（`createdAt + 30 天`）。查询/校验时惰性判断 `expiresAt < now` 即视为失效（未过期先返回 401/重定向登录），不引入后台定时清理任务（MVP 范围内可接受表随时间增长；后续可选增加定期清理任务，超出本功能范围）。

**Rationale**: 与现有 `channels`/`notes` 表的建表风格（`text` 主键、`integer` 时间戳、`references(...).onDelete`）保持一致，最大化复用 Drizzle schema 约定，降低维护成本。

**Alternatives considered**:

- **额外记录 `lastUsedAt`/`userAgent`/`ip` 等元数据**：可增强审计能力，但 spec 未提出此类可视化/追踪需求，属于范围外的过度设计 — 拒绝（后续如有需要可单独提出）。

## 5. 安全事件日志

**Decision**: 复用仓库现有的 `console.log`/`console.error` 结构化日志方式（与 `src/db/index.ts` 中 `[D1] query` 日志风格一致），在关键节点打印带前缀的结构化事件，例如 `console.info("[auth] calieo login success", { userId, sessionId })`、`console.warn("[auth] calieo state mismatch")`。

**Rationale**: Cloudflare Workers `observability.enabled: true`（见 `wrangler.jsonc`）已经会采集 `console.*` 输出到 Cloudflare 的可观测性平台，无需引入新的日志基础设施即可满足 FR-015 的审计诉求。

**Alternatives considered**:

- **引入专门的日志/审计表或第三方日志服务**：超出本功能范围，且与现有项目日志方式不一致 — 拒绝。

## 6. 速率限制 / 暴力破解防护

**Decision**: 不在应用代码中实现，按 Clarify 结论交由 Cloudflare 边缘层（WAF / Rate Limiting 规则）处理；在 `quickstart.md` 中记录部署侧的建议配置（供运维参考），不作为本功能的代码交付物。

**Rationale**: 与用户在 Clarify 阶段的明确选择一致，避免在应用层重复实现基础设施已提供的能力。
