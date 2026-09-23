# 契约：频道发布

**路由**: `POST /api/console/channels/[channelId]/publish`（新增）

**认证**: 需要控制台登录会话，且频道必须归当前用户所有。

**对应需求**: spec.md FR-005、FR-006、FR-019

## 请求

```text
POST /api/console/channels/{channelId}/publish
Content-Type: application/json

{}   // 无需请求体字段，二次确认由前端弹窗完成，命中此接口即代表已确认
```

## 行为

1. 校验 `channelId` 对应的频道存在且 `user_id` 等于当前登录用户，否则 404。
2. 更新频道：
   - 若当前用户 `sysrole = "admin"`：`approval_status = "approved"`，不创建 `approval_events` 行。
   - 否则：`approval_status = "pending"`，创建一条 `approval_events` 行（`type = "channel"`，`channel_id = channelId`，`action` 取 `"created"` 或 `"updated"`，规则同笔记发布契约）。
3. 若频道当前存在未处理的待审核事件，同笔记发布契约第 4 点，一并作废。

## 响应

- `200 OK`：`{ "id": string, "approvalStatus": "pending" | "approved" }`
- `404`：`{ "error": "channel_not_found" }`
- `403`：未登录 / 会话无效

## 前端交互契约

点击频道编辑页的"发布"按钮时，前端必须先弹出二次确认弹窗（仅确认/取消，无表单输入）；只有用户点击确认后，才调用本接口。点击取消不得触发任何网络请求。
