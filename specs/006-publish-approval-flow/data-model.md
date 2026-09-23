# Phase 1 数据模型：笔记与频道的保存/发布分离及审核流程简化

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Date**: 2026-09-22

## 实体总览

| 实体 | 对应表 | 本次变更 |
| --- | --- | --- |
| 笔记（Note） | `notes` | 移除 `is_published` 列；`approval_status` 由二态扩展为四态 |
| 频道（Channel） | `channels` | 移除 `is_public` 列；`approval_status` 由二态扩展为四态 |
| 待审核事件（Approval Event） | `approval_events` | 结构不变；新增"作废"语义（`handled_by = null` 且 `result = null` 的已处理事件，见 research.md Decision 3） |

## Note（notes 表）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | text，主键 | 不变 |
| `user_id` | text，外键 → `users.id` | 不变 |
| `channel_id` | text，外键 → `channels.id`，可空 | 不变；发布时必须非空（见校验规则） |
| `parent_id` | text，外键 → `notes.id`，可空 | 不变（目录层级） |
| `title` / `body` | text | 不变 |
| `mime_type` | text（`"text/markdown" \| "directory"`） | 不变 |
| ~~`is_published`~~ | ~~boolean~~ | **移除**，语义并入 `approval_status`：`approval_status !== "draft"` 且有 `channel_id` 即代表"已提交发布" |
| `approval_status` | text（`"draft" \| "pending" \| "approved" \| "rejected"`），默认 `"draft"` | **取值范围扩展**（原 `"pending" \| "approved"`） |
| `created_at` / `updated_at` | integer（timestamp） | 不变 |

### 校验规则

- 新增/编辑（仅保存）：`approval_status` 强制写为 `"draft"`（FR-002/FR-003），不校验 `channel_id`。
- 发布（FR-010）：`channel_id` 必须为非空字符串（前端弹窗强制选择频道后才允许提交）；发布时若为管理员则 `approval_status = "approved"`，否则 `approval_status = "pending"` 并创建 `approval_events` 行。
- 目录型笔记（`mime_type = "directory"`）不参与发布流程，`approval_status` 始终保持默认 `"draft"`（沿用现状：批量操作等入口已将目录排除在外）。

## Channel（channels 表）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | text，主键 | 不变 |
| `user_id` | text，外键 → `users.id` | 不变 |
| `name` / `description` | text | 不变 |
| ~~`is_public`~~ | ~~boolean~~ | **移除**，语义并入 `approval_status`：`approval_status === "approved"` 即代表"公开" |
| `approval_status` | text（`"draft" \| "pending" \| "approved" \| "rejected"`），默认 `"draft"` | **取值范围扩展**（原 `"pending" \| "approved"`） |
| `created_at` | integer（timestamp） | 不变 |

### 校验规则

- 新增/编辑（仅保存）：`approval_status` 强制写为 `"draft"`。
- 发布（FR-019）：无需额外输入，仅二次确认；管理员 → `"approved"`，非管理员 → `"pending"` 并创建 `approval_events` 行。

## Approval Event（approval_events 表，结构不变）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | text，主键 | 不变 |
| `type` | text（`"note" | "channel"`） | 不变 |
| `note_id` / `channel_id` | text，外键，可空 | 不变（二选一） |
| `action` | text（`"created" \| "updated"`） | 不变；由发布动作触发时统一按"当前笔记/频道是否为该用户首次发布"复用现有 `created`/`updated` 语义 |
| `is_handled` | boolean | 不变 |
| `handled_at` | integer，可空 | 不变 |
| `handled_by` | text，外键 → `users.id`，可空 | 不变；`null` 现在有双重含义之一：**未处理**（`is_handled = false`）或**被所有者编辑作废**（`is_handled = true` 且 `result = null`），二者通过 `is_handled` 区分 |
| `result` | text（`"approved" | "rejected"`），可空 | 不变；管理员未处理或事件被作废时为 `null` |
| `created_at` | integer | 不变 |

未新增列、未新增表，符合 research.md Decision 3 的最小改动结论。

## 状态转换（Note / Channel 共用的 `approval_status` 状态机）

```text
draft --[发布，非 admin]--> pending
draft --[发布，admin]--> approved

pending --[管理员批准]--> approved
pending --[管理员拒绝]--> rejected
pending --[所有者再次编辑并保存]--> draft（原待审核事件被作废）

approved --[所有者再次编辑并保存]--> draft

rejected --[所有者再次编辑并保存]--> draft
```

- 唯一能进入 `pending` 的路径是"非管理员发布"。
- 唯一能进入 `approved` 的路径是"管理员发布"或"管理员批准某条 `pending` 事件"。
- `rejected` 只能由"管理员拒绝某条 `pending` 事件"产生。
- 从 `pending` / `approved` / `rejected` 出发，任何一次"编辑并保存"（不点发布）都会回到 `draft`，且若当前存在未处理的 `pending` 事件，该事件被同步作废（见 Approval Event 表说明）。

## 公开可见性派生规则（非存储字段，查询时计算）

```text
频道公开可见  := channel.approval_status = "approved"
笔记公开可见  := note.approval_status = "approved"
             AND note.channel_id IS NOT NULL
             AND channel(note.channel_id).approval_status = "approved"
```

对应 spec.md FR-007 / FR-018 / SC-006。生产环境（非 `NODE_ENV=development`）的全部公开页面查询（首页、频道列表、频道详情、笔记详情）必须在 SQL `WHERE`/`JOIN` 条件中直接体现上述规则，而非查询后在应用层过滤（见 research.md Decision 4 关于 `!isDev` 旁路的说明——该旁路只跳过审核状态检查，不影响"笔记需归属频道"这一结构性前提）。

## Drizzle schema 变更摘要（`src/db/schema.ts`）

- `channels`：删除 `isPublic` 字段定义；`approvalStatus` 的 `.$type<...>()` 泛型参数由 `"pending" | "approved"` 扩展为 `"draft" | "pending" | "approved" | "rejected"`；`.default("pending")` 改为 `.default("draft")`。
- `notes`：删除 `isPublished` 字段定义；`approvalStatus` 同上扩展 `.$type<...>()` 与默认值。
- `approvalEvents`：无字段变更。

## 迁移文件

`migrations/0007_publish_approval_flow.sql`：按 research.md Decision 1 的映射规则回填数据后删除两个布尔列，实现方式参考已有的 `migrations/0004_channel_approval.sql`（建新表→拷贝→删旧表→改名）模式处理列删除（SQLite 对 `DROP COLUMN` 的支持因版本而异，沿用项目既有的重建表模式最稳妥）。具体迁移 SQL 由 `/speckit-tasks` 阶段的任务落实并通过 `drizzle-kit` 生成/校验。
