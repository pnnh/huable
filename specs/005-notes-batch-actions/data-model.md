# Phase 1 数据模型: 笔记批量设置频道与发布状态

本功能不新增数据库表或字段，复用 [schema.ts](../../src/db/schema.ts) 中已有的 `notes`、`channels` 表。
以下描述与本功能相关的字段、约束和状态转换。

## 实体：笔记（notes 表，节选）

| 字段 | 类型 | 与本功能的关系 |
|------|------|----------------|
| `id` | text，主键 | 复选框勾选的唯一标识，批量请求以 `noteIds: string[]` 传递 |
| `userId` | text，外键 → `users.id` | 批量更新前必须校验 `userId === 当前登录用户`，否则跳过该条 |
| `channelId` | text，外键 → `channels.id`，可为空 | "设置频道"批量操作的目标字段；可被置为具体频道 id 或 `null`（无频道） |
| `parentId` | text，外键 → `notes.id`，可为空 | 不参与本功能的写操作，仅用于判断笔记所在层级（前端渲染用） |
| `mimeType` | `"text/markdown" \| "directory"` | 批量操作的过滤条件：仅 `mimeType !== "directory"` 的记录可被勾选、可被批量更新 |
| `isPublished` | boolean | "设置发布状态"批量操作的目标字段；取值 `true`（已发布）/`false`（草稿） |
| `approvalStatus` | `"pending" \| "approved"` | 批量更新 `channelId` 或 `isPublished` 后，必须按下方规则重新计算，不可由前端直接指定 |
| `updatedAt` | number（毫秒时间戳） | 批量更新命中的每条记录都需要刷新为当前时间 |

### 派生规则：`approvalStatus` 重算

对每条命中的笔记，取其"本次更新后的最终值"：

```text
finalChannelId   = 请求中提供了 channelId   ? 请求值 : 该笔记更新前的 channelId
finalIsPublished = 请求中提供了 isPublished ? 请求值 : 该笔记更新前的 isPublished

approvalStatus = (finalChannelId 非空 且 finalIsPublished === true) ? "pending" : "approved"
```

此规则与 `[noteId]/page.tsx` 中单笔记编辑的 `needsApproval` 计算方式一致（详见 research.md 决策 2）。

## 实体：频道（channels 表，节选）

| 字段 | 类型 | 与本功能的关系 |
|------|------|----------------|
| `id` | text，主键 | "设置频道"弹窗中可选项的值 |
| `userId` | text，外键 → `users.id` | 批量设置频道时，目标 `channelId` 必须属于当前登录用户（不可将笔记指派给他人频道）；`channelId` 为空（无频道）时跳过此项校验 |
| `name` | text | 弹窗中频道选项的展示文案 |

## 请求 / 响应契约实体（非持久化，仅用于 API 边界）

### BatchUpdateRequest

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteIds` | `string[]` | 是 | 待更新的笔记 id 列表；非空，长度上限 200；服务端不因单个非法 id 而整体拒绝请求，而是逐条判定 |
| `channelId` | `string \| null` | 否 | 缺省表示"本次不修改频道"；`null` 表示批量清空频道；非空字符串必须是当前用户拥有的频道 id |
| `isPublished` | `boolean` | 否 | 缺省表示"本次不修改发布状态" |

约束：`channelId` 与 `isPublished` 至少提供一个，否则请求视为无效（400）。

### BatchUpdateResult

| 字段 | 类型 | 说明 |
|------|------|------|
| `updated` | `string[]` | 成功更新的笔记 id 列表 |
| `skipped` | `{ id: string; reason: "not_found" \| "not_owned" \| "is_directory" }[]` | 未被更新的 id 及原因，对应 spec 中"批量操作提交后...部分失败"的 Edge Case |

## 状态转换图（针对单条笔记的 `approvalStatus`）

```text
                提供 channelId(非空) 且 isPublished=true
   ┌────────────┐ ────────────────────────────────────▶ ┌───────────┐
   │  approved   │                                       │  pending  │
   └────────────┘ ◀──────────────────────────────────── └───────────┘
                其余任意组合（channelId 为空 或 isPublished=false）
```

该转换在批量更新与单条编辑（`[noteId]/page.tsx`）中共享，本功能不引入新的状态值。
