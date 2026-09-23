# 契约：审核事件处理（既有端点，行为补全）

**路由**: `PATCH /api/console/approvals/[eventId]`（既有端点，请求/响应形状不变，`reject` 分支行为补全）

**认证**: 需要 `sysrole = "admin"`（既有校验不变）。

**对应需求**: spec.md FR-005、FR-006、FR-015

## 请求（不变）

```text
PATCH /api/console/approvals/{eventId}
Content-Type: application/json

{ "action": "approve" | "reject" }
```

## 变更点

现状实现（`src/app/api/console/approvals/[eventId]/route.ts`）中，`action = "reject"` 时只更新 `approval_events.result = "rejected"`，**未回写**对应笔记/频道的 `approval_status`，导致被拒绝内容会永远停留在 `"pending"`，无法被所有者重新编辑发布。本次变更后：

- `action = "approve"`：行为不变——`approval_events` 标记为已处理（`result = "approved"`），对应笔记/频道 `approval_status` 置为 `"approved"`。
- `action = "reject"`：新增回写——`approval_events` 标记为已处理（`result = "rejected"`），**新增**对应笔记/频道 `approval_status` 置为 `"rejected"`（此前代码未做此更新）。

## 响应（不变）

- `200 OK`：`{ "ok": true }`
- `403` / `404` / `409`：既有错误分支不变（非管理员 / 事件不存在 / 事件已处理）
