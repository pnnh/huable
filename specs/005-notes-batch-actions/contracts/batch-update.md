# 契约：批量更新笔记频道 / 发布状态

**端点**: `POST /api/console/notes/batch`

**使用方**: `NotesBatchToolbar`（新增客户端组件）在用户确认"设置频道"或"设置发布状态"弹窗后调用；
同一端点被两个弹窗共用，通过只传各自关心的字段区分意图。

**鉴权**: 与现有 `/api/console/notes/*` 路由一致，调用 `requireConsoleAuth()`，未登录返回 `401`。

## 请求

```http
POST /api/console/notes/batch
Content-Type: application/json

{
  "noteIds": ["note_abc", "note_def"],
  "channelId": "channel_123"
}
```

或：

```http
POST /api/console/notes/batch
Content-Type: application/json

{
  "noteIds": ["note_abc", "note_def"],
  "isPublished": true
}
```

字段定义见 [data-model.md](../data-model.md) 的 `BatchUpdateRequest`。

### 请求校验（按顺序）

1. `noteIds` 缺失、非数组或为空数组 → `400 { "error": "note_ids_required" }`
2. `noteIds.length > 200` → `400 { "error": "too_many_notes" }`
3. `channelId` 与 `isPublished` 均未提供 → `400 { "error": "no_updates_provided" }`
4. 若提供 `channelId` 且非 `null`：该 id 必须存在于 `channels` 表且 `channels.userId === 当前用户`，
   否则 → `400 { "error": "channel_not_found" }`（整体拒绝，不做部分跳过——目标频道非法是请求层面的错误，
   与单条笔记的所有权问题性质不同）

### 笔记级过滤（不导致整体请求失败）

对 `noteIds` 中的每个 id，查询 `notes` 表：

- 不存在 → 记为 `skipped: { id, reason: "not_found" }`
- 存在但 `userId !== 当前用户` → 记为 `skipped: { id, reason: "not_owned" }`（对外表现与 `not_found`
  相同的"跳过"语义，避免泄露他人笔记是否存在，但 `reason` 字段本身仅返回给已认证的请求发起者，用于前端提示）
- 存在但 `mimeType === "directory"` → 记为 `skipped: { id, reason: "is_directory" }`
- 其余情况：按 data-model.md 的重算规则更新 `channelId`/`isPublished`/`approvalStatus`/`updatedAt`，
  id 加入 `updated`

## 响应

### 成功（含部分跳过也返回 200，跳过详情通过 `skipped` 字段暴露）

```http
200 OK
Content-Type: application/json

{
  "updated": ["note_abc"],
  "skipped": [{ "id": "note_def", "reason": "not_found" }]
}
```

### 请求整体非法

```http
400 Bad Request
Content-Type: application/json

{ "error": "note_ids_required" | "too_many_notes" | "no_updates_provided" | "channel_not_found" }
```

### 未登录

```http
401 Unauthorized
Content-Type: application/json

{ "error": "Unauthorized" }
```

## 前端消费约定

- `updated.length === noteIds.length` 时，弹窗直接关闭并提示成功，列表通过 `router.refresh()` 刷新
  （沿用 `CreateDirectoryDialog` 的既有模式）。
- `skipped.length > 0` 时，提示"N 篇笔记未能更新"，具体原因映射为对应语言的用户可读文案，
  仍需对 `updated` 中的笔记刷新列表并清空其勾选状态；`skipped` 中的笔记保留未勾选或提示用户重新检查。
- 网络错误 / 非 2xx 响应：提示通用失败文案，不清空勾选状态，允许用户重试。
