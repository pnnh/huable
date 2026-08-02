# Data Model: 笔记目录（文件夹）管理

## 实体：`notes`（扩展现有表）

`notes` 表沿用现有字段，新增以下两个字段以支持目录：

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `mime_type` | text | NOT NULL，默认 `text/markdown` | `text/markdown` 表示笔记条目；`directory` 表示目录条目 |
| `parent_id` | text | 可为空，外键引用 `notes.id`，`ON DELETE cascade` | 所属父目录的 `id`；为空表示位于根目录 |

现有字段保持不变：`id`（Base58 主键，`createId()` 生成）、`user_id`、`channel_id`、`title`、`body`、`is_published`、`approval_status`、`created_at`、`updated_at`。

### 字段复用约定

- 目录名称复用 `title` 字段（必填，与笔记标题共用同一列）。
- 目录描述复用 `body` 字段（可选；为目录条目时允许空字符串）。
- `channel_id`、`is_published`、`approval_status` 对目录类型条目不生效，创建目录时固定写入：`channel_id = null`、`is_published = false`、`approval_status = "approved"`（目录无需发布/审批流程）。

### 自引用关系

`notes.parent_id → notes.id`：一个笔记条目（目录或笔记）最多属于一个父目录；一个目录可以有零到多个直接子级（目录或笔记）。`ON DELETE cascade` 沿用现有 `noteAttachments` 对 `notes` 的级联风格，保证若父目录被删除（超出本次范围，但为保持模型一致性预先设置），其子级也会被级联删除。

### 校验规则

- **名称唯一性**：同一 `user_id` 下，同一 `parent_id`（含 `parent_id IS NULL` 的根目录场景）范围内，不允许存在两条 `title` 相同的记录，无论其 `mime_type` 是 `directory` 还是 `text/markdown`。此校验在应用层（API 处理函数）实现，创建前查询同层级同名记录（参见 [research.md](./research.md) 第 5 节）。
- **目录名称必填**：创建目录时 `title` 去除首尾空白后不能为空字符串。
- **权限隔离**：创建目录时若指定了 `parent_id`，必须校验该父目录记录存在、`mime_type = "directory"`，且属于当前 `user_id`；否则拒绝创建。
- **类型不可变**：本次范围内不支持修改已创建条目的 `mime_type`（即笔记与目录之间不可互相转换）。

### 派生字段（仅用于展示，不落库）

- `hasChildren: boolean`：树形表格渲染目录条目时，通过 `COUNT(*)` 子查询预计算该目录是否存在直接子级，用于决定三角图标是否可展开以及展开空目录时展示"暂无内容"。

## 状态与生命周期

本次范围仅覆盖目录的**创建**：

```text
(不存在) --创建--> 目录条目存在于根目录或指定父目录下
```

不支持重命名、移动（更改 `parent_id`）、删除、类型转换；这些能力在 [spec.md](./spec.md) 的 Assumptions 中已明确列为超出本次范围。

## 迁移影响

- 新增迁移文件为 `notes` 表增加 `mime_type`（默认 `text/markdown`）与 `parent_id`（默认 `NULL`）两列。
- 历史数据无需回填：新增列均带默认值，现有笔记记录自动获得 `mime_type = "text/markdown"`、`parent_id = NULL`（根目录），与现有列表页展示行为完全兼容。
- 迁移通过 `drizzle-kit` 生成 SQL 文件落入 `migrations/`，由 `pnpm db:migrate`（本地）以及部署流程中对 Cloudflare D1 执行的迁移命令共同应用，保证开发与生产环境 schema 一致。
