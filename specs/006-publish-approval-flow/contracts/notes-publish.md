# 契约：笔记发布

**路由**: `POST /api/console/notes/[noteId]/publish`（新增）

**认证**: 需要控制台登录会话（复用 `requireConsoleAuth()`），且笔记必须归当前用户所有。

**对应需求**: spec.md FR-005、FR-006、FR-010

## 请求

```text
POST /api/console/notes/{noteId}/publish
Content-Type: application/json

{
  "channelId": "string"   // 必填，必须是当前用户拥有的频道 id
}
```

## 行为

1. 校验 `noteId` 对应的笔记存在且 `user_id` 等于当前登录用户，否则 404。
2. 校验 `channelId` 非空，且对应频道存在且归当前用户所有，否则 400。
3. 更新笔记：`channel_id = channelId`；
   - 若当前用户 `sysrole = "admin"`：`approval_status = "approved"`，不创建 `approval_events` 行。
   - 否则：`approval_status = "pending"`，创建一条 `approval_events` 行（`type = "note"`，`note_id = noteId`，`action` 取 `"created"`（若笔记此前从未提交过发布）或 `"updated"`（若此前已有过发布记录））。
4. 若笔记当前存在未处理的待审核事件（`is_handled = false`），视为被本次发布替代，一并标记为已处理（`is_handled = true`，`handled_by = null`，`result = null`，`handled_at = now`），避免同一笔记同时存在两条待处理事件。

## 响应

- `200 OK`：`{ "id": string, "channelId": string, "approvalStatus": "pending" | "approved" }`
- `400`：`{ "error": "channel_id_required" | "channel_not_found" }`
- `404`：`{ "error": "note_not_found" }`
- `403`：未登录 / 会话无效（`requireConsoleAuth()` 既有行为）

## 与既有端点的关系

- 与保存笔记的 Server Action（`src/app/[lang]/console/notes/[noteId]/page.tsx` 内 `handleSave`）职责分离：`handleSave` 之后只写 `approval_status = "draft"`，不再接受 `channelId`/`isPublished` 输入；发布只能通过本端点触发。
