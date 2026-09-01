# Data Model: 通过 Calieo 实现 OAuth2/OIDC 登录

## 新增实体

### `sessions`（服务端会话表，Drizzle schema 新增）

对应 spec.md 中的 **用户会话（服务端存储）** 实体；与 `users` 表为一对多关系（FR-014）。

| 字段 | 类型 | 约束 | 说明 |
| ------ | ------ | ------ | ------ |
| `id` | `text` | 主键，`$defaultFn(createId)` | 不透明会话 ID，同时作为 `session_id` Cookie 的值；不携带任何可解读的用户信息 |
| `user_id` | `text` | `NOT NULL`，外键 → `users.id`，`ON DELETE cascade` | 会话归属用户；用户被删除时级联清理其所有会话 |
| `created_at` | `integer` | `NOT NULL`，`$defaultFn(() => Date.now())` | 会话创建时间（毫秒时间戳），用于审计 |
| `expires_at` | `integer` | `NOT NULL` | 会话过期时间（毫秒时间戳），创建时设置为 `created_at + 30 天`（FR-013）；服务端校验时若 `now > expires_at` 视为失效 |

**校验规则**:

- 查表命中且 `expires_at > now` → 会话有效，返回关联的 `CurrentUser`。
- 查表未命中，或已过期 → 视为未登录（不自动删除过期行，避免额外写操作；清理可作为后续独立任务）。
- 登出（FR-010）：删除 `id` 对应的这一行（不影响同一 `user_id` 下的其他会话行，满足 FR-014/SC-006）。

**状态转换**:

```text
[不存在] --Calieo 登录成功(FR-006)--> [有效]
[有效]   --到达 expires_at(FR-013)--> [已过期，视为不存在]
[有效]   --用户登出(FR-010)---------> [已删除]
[有效]   --用户被删除(级联)----------> [已删除]
```

### Drizzle schema 示意（追加到 `src/db/schema.ts`，与现有表风格一致）

```ts
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  expiresAt: integer("expires_at").notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
```

（`usersRelations` 需追加 `sessions: many(sessions)`。）

## 复用实体（不变更结构）

### `users`

无需新增字段。Calieo 登录复用现有 `ensureUserRow` 逻辑：按 ID 令牌中的 `email` 声明唯一匹配已存在用户；不存在则以 `email`/`name` 声明创建新用户（`createId()` 生成内部 id）；首个登录用户自动提升为 `admin`（沿用 `src/lib/auth.ts` 现有规则，不改变）。

## 临时数据（不落库，随请求生命周期存在）

### OAuth 登录请求状态（`calieo_oauth_state` Cookie）

对应 spec.md 中的 **OAuth 登录请求状态（临时）** 实体。不作为数据库实体建模，仅作为登录发起 → 回调这一次浏览器往返间传递的临时数据（详见 [research.md](./research.md) 决策 2）。

| 字段 | 说明 |
| ------ | ------ |
| `state` | 随机值，回调时与 URL 查询参数中的 `state` 比对，防 CSRF/重放（FR-002） |
| `code_verifier` | PKCE 校验值，回调时随授权码一起提交给 token 端点（FR-002） |
| `nonce` | 写入授权请求，回调后与 ID 令牌中的 `nonce` 声明比对，防重放（FR-004） |

生命周期：登录发起时创建（短有效期，如 10 分钟），回调处理完成后（无论成功或失败）立即清除。
