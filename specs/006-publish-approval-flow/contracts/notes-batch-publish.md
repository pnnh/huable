# 契约：笔记批量发布（既有端点变更）

**路由**: `POST /api/console/notes/batch`（既有端点，请求/响应契约变更）

**认证**: 需要控制台登录会话，笔记与频道均须归当前用户所有。

**对应需求**: spec.md FR-012、FR-013、FR-014；research.md Decision 5

## 变更前 → 变更后

**变更前**（现状）：

```text
{
  "noteIds": string[],
  "channelId"?: string | null,   // 可选，独立生效
  "isPublished"?: boolean        // 可选，独立生效
}
```

**变更后**：

```text
{
  "noteIds": string[],   // 必填，1~200 项（MAX_NOTE_IDS 不变）
  "channelId": string    // 必填，必须是当前用户拥有的频道 id；不再接受 null
}
```

`isPublished` 字段整体移除——批量操作只保留"批量发布"这一种语义，不再支持"只改频道不发布"或"只改发布状态不改频道"的组合调用（对应 Clarifications：不保留批量撤回为草稿的能力）。

## 行为

对 `noteIds` 中每一条笔记，跳过规则不变（不存在 → `not_found`；不属于当前用户 → `not_owned`；`mime_type = "directory"` → `is_directory`），其余笔记：

1. `channel_id = channelId`。
2. 若当前用户 `sysrole = "admin"`：`approval_status = "approved"`，不创建 `approval_events` 行。
3. 否则：`approval_status = "pending"`，为每条笔记各创建一条 `approval_events` 行（逐条独立记录，便于管理员在审核列表中逐条区分处理）。
4. 若某条笔记当前存在未处理的待审核事件，同单篇发布契约，一并作废后再创建新事件。

## 响应（结构不变）

```text
{
  "updated": string[],                              // 成功发布的笔记 id
  "skipped": { "id": string, "reason": SkipReason }[] // 跳过的笔记及原因，SkipReason 不变
}
```

## 前端交互契约

`NotesBatchToolbar.tsx` 原有的"设置频道"与"设置发布状态"两个按钮合并为一个"批量发布"按钮；点击后弹出频道选择弹窗（选中频道 + 确认，无独立的发布状态选项），确认后调用本接口。
