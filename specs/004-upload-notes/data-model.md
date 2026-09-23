# Phase 1 Data Model: 批量上传 Markdown 笔记

## 持久化实体

本特性**不新增、不变更任何数据库表结构**，复用 `src/db/schema.ts` 中既有的 `notes` 表（详见 [001-note-directories/data-model.md](../001-note-directories/data-model.md) 中对该表 `mime_type`/`parent_id` 字段的完整定义）。批量上传只是 `notes` 表的一种新增录入方式，与手动 "New Note" 表单创建、目录创建共用同一张表和同一套校验规则。

### `notes` 表——本特性涉及的字段取值

| 字段 | 类型 | 批量上传时的取值 | 说明 |
|---|---|---|---|
| `id` | text (PK) | `createId()` 生成 | 与现有笔记/目录创建一致 |
| `userId` | text | 当前登录用户 ID | 来自 `getCurrentUser()` |
| `channelId` | text \| null | `null` | Assumptions：上传的笔记默认不关联频道 |
| `parentId` | text \| null | 上传页面接收到的目录上下文 | `null` 表示根目录；非空需先经 `resolveOwnedDirectory` 校验 |
| `title` | text | 文件名去除 `.md`/`.markdown` 后缀 | 需经 `assertUniqueNameInParent` 校验同层唯一 |
| `body` | text | 文件的文本内容（`file.text()`） | 原样存入，不做 Markdown 语法校验 |
| `mimeType` | text | `"text/markdown"` | 与手动创建笔记的默认值一致，区别于 `"directory"` |
| `isPublished` | boolean | `false` | Assumptions：默认草稿态 |
| `approvalStatus` | text | `"approved"` | 未发布到频道，无需审批（沿用 `directories/route.ts` 的默认语义） |
| `createdAt` / `updatedAt` | integer | `Date.now()` | 与既有创建流程一致 |

**校验规则**（复用 `src/lib/notesTree.ts`，不新增规则）：

- `resolveOwnedDirectory(db, userId, parentId)`：`parentId` 非空时必须指向当前用户拥有的、`mimeType = "directory"` 的记录，否则视为父目录不存在。
- `assertUniqueNameInParent(db, userId, parentId, title)`：同一 `parentId` 层级下 `title` 不能与已有笔记或目录重复。

## 页面内瞬时状态（不持久化）

### `UploadQueueItem`（客户端组件内存状态，`NoteUploadQueue.tsx`）

仅存在于上传页面的组件生命周期内；用户离开或刷新页面即丢失，不写入任何存储介质。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 客户端生成的临时标识（如 `crypto.randomUUID()`），仅用于 React key 与状态更新定位，不对应任何服务端记录 |
| `file` | `File` | 浏览器 `File` 对象引用，用于读取内容并发起上传 |
| `name` | string | `file.name`（含后缀），列表展示用 |
| `extension` | string | 从 `file.name` 解析出的后缀名（如 `md`） |
| `sizeBytes` | number | `file.size` |
| `lastModified` | number (epoch ms) | `file.lastModified` |
| `status` | `"pending" \| "uploading" \| "success" \| "failed"` | 队列状态标签的数据来源；`"uploading"` 为内部调度状态，UI 上与 `"pending"` 均可归入"待上传"视觉分组，但用于并发池判断哪些文件已占用并发槽位 |
| `errorMessage` | string \| null | 仅 `status === "failed"` 时有值，供状态标签悬停展示 |
| `noteId` | string \| null | 仅 `status === "success"` 时有值，来自服务端返回的新建笔记 ID（当前 UI 不展示，但预留用于后续可能的跳转/高亮） |

**状态迁移**：

```
pending --(并发槽位可用，发起请求)--> uploading --(响应 2xx)--> success
                                              \--(响应非 2xx 或网络错误)--> failed
pending --(用户点击移除)--> [从队列中移除，不再存在]
```

- 仅 `pending` 状态的条目允许被移除（对应 spec User Story 2 的验收标准：已进入 `uploading`/`success`/`failed` 的条目不可移除）。
- `uploading` 状态不可逆地转向 `success` 或 `failed` 之一，不存在重试回退到 `pending` 的行为（spec 未要求重试功能）。

## 实体关系

```
用户（User，既有） 1 ── N notes（既有表，本特性新增录入路径）
notes.parentId 自引用 notes.id（既有，表达目录层级；本特性写入端遵循既有约束，不新增关系）
```

`UploadQueueItem` 与任何持久化实体均无外键/引用关系——它是纯前端视图模型，仅在上传成功后间接对应一条新建的 `notes` 记录（通过一次性的 API 响应关联，不做双向绑定）。
