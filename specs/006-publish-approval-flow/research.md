# Phase 0 研究：笔记与频道的保存/发布分离及审核流程简化

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-22

本阶段解决 Technical Context 中标记的技术未知点，均为纯技术实现决策（业务规则已在 spec.md 的 Clarifications 中由用户确认）。

## Decision 1：存量数据迁移映射规则

**Decision**: 新增一份迁移文件（`migrations/0007_publish_approval_flow.sql`），在同一迁移中完成三件事：

1. 为 `channels`、`notes` 的 `approval_status` 列扩展允许值（SQLite 的 `text` 列本身无 CHECK 约束，Drizzle 层通过 TypeScript 联合类型 `"draft" | "pending" | "approved" | "rejected"` 约束，无需额外 DDL）。
2. 按以下规则回填现有行的 `approval_status`，然后再删除 `is_public`（channels）与 `is_published`（notes）两列：
   - **channels**：`is_public = false` → `approval_status = 'draft'`（不论原 `approval_status` 取值，因为从未真正对外公开过）；`is_public = true` 时保留原 `approval_status`（`'pending'` 或 `'approved'` 均照抄）。
   - **notes**：`is_published = false` 或 `channel_id IS NULL` → `approval_status = 'draft'`；否则（已发布且有频道）保留原 `approval_status`。
3. 用 SQLite 的"建新表 → 拷贝数据 → 删旧表 → 改名"模式（与 `migrations/0004_channel_approval.sql` 已用过的模式一致）删除两个布尔列。

**Rationale**：保证迁移前后公开页面的可见性结果一致——迁移前已经"已发布且已审核"的内容，迁移后必须仍然是 `approved` 从而继续可见；迁移前是草稿或未发布的内容，迁移后必须是 `draft`，不会被误判为需要审核而突然出现在管理员待审核队列里。

**Alternatives considered**：
- 全部行统一重置为 `draft`：实现最简单，但会让所有存量已发布内容瞬间从公开页面消失，且需要用户逐一重新点击发布、管理员逐一重新审核，产生不必要的审核积压，用户体验回归——拒绝。
- 保留旧布尔列作为兼容层，仅新增逻辑不做真删除：与 spec.md FR-001"不再使用独立的布尔型字段"明确冲突——拒绝。

## Decision 2：四态枚举的存储命名

**Decision**: `approval_status` 的存储值使用英文技术标识符 `"draft" | "pending" | "approved" | "rejected"`（`draft` 对应规格中的"未发布"）。

**Rationale**：与现有 `approval_events.result` 字段的 `"approved" | "rejected"` 保持字面风格一致，但两者语义不同——`approval_status` 描述内容实体的**当前状态**，`approval_events.result` 描述**某一次审核事件的处理结果**；在 `data-model.md` 中会显式注释区分，避免实现时混淆。沿用现有 schema.ts 中 `$type<"pending" | "approved">()` 的既有写法风格，只是扩展取值范围，属最小改动。

**Alternatives considered**：中文拼音或中文字符串作为存储值——与代码库现有字段命名风格（英文技术标识符）不一致，且不便于后续 SQL 查询书写——拒绝。

## Decision 3："待审核事件作废"的存储表示

**Decision**: 复用现有 `approval_events` 表结构，不新增列、不新增表。所有者在事件未处理前再次编辑保存时，系统将该事件更新为：`is_handled = true`、`handled_by = null`、`handled_at = <保存时间戳>`、`result = null`。管理员审核列表按 `is_handled` 过滤"待处理"时，作废事件自动归入"已处理"分组，不再出现在待处理队列（满足 FR-017）。若审核详情/历史页面需要区分"作废"与"管理员正常处理"，可用 `handled_by IS NULL AND result IS NULL` 判定并展示"已作废"标签（此为可选的 UI 增强，非本功能强制要求）。

**Rationale**：符合"简洁优先"与"精准手术式修改"原则——不引入新枚举值或新字段，复用 `is_handled`/`handled_by`/`result` 这组已经存在、语义相近的列。`handled_by = null` 天然表达"不是被某个管理员处理的"，与"作废"的语义吻合。

**Alternatives considered**：
- 新增 `result = "superseded"` 枚举值：`result` 字段的现有语义是"管理员的审核结果"，`/api/console/approvals/[eventId]` 的 PATCH 接口目前只接受 `action: "approve" | "reject"` 两种管理员动作，把系统自动触发的"作废"也塞进这个字段会混淆"谁做出的决定"——拒绝。
- 物理删除该行：会丢失"用户曾经提交过一次发布申请"的审计记录，与当前系统保留历史事件的模式（`approval_events` 表从不物理删除记录）不一致——拒绝。

## Decision 4：保留 `!isDev` 本地开发旁路约定

**Decision**: 维持 `src/app/[lang]/page.tsx`、`channels/page.tsx`、`channels/[id]/page.tsx`、`notes/[id]/page.tsx` 中现有的 `process.env.NODE_ENV === "development"` 判断逻辑不变，仅将其中判断 `approval_status !== "approved"` 的比较逻辑同步到新的四态取值（判断条件本身不变，只是可比较的失败值从两态变成四态中的非 `approved` 值）。

**Rationale**：这是代码库既有的本地调试约定（本地开发环境跳过审核状态过滤，方便预览未审核内容），不属于 spec.md 要求调整的范围，维持现状风险最低。

**Alternatives considered**：移除该旁路，本地也强制过滤——超出本次需求范围，且会让本地测试发布流程变得更繁琐（每次都要手动把数据库中的记录改成 `approved` 才能在页面看到）——拒绝，不在本次改动中处理。

## Decision 5：批量发布端点契约变更

**Decision**: `POST /api/console/notes/batch` 的请求体从当前的 `{ noteIds: string[], channelId?: string | null, isPublished?: boolean }`（两个字段均可选，各自独立生效）收敛为 `{ noteIds: string[], channelId: string }`（`channelId` 必填，且语义等同于"对这些笔记执行一次发布"）。响应体结构 `{ updated: string[], skipped: {id, reason}[] }` 保持不变，以复用 `NotesBatchToolbar.tsx` 现有的结果展示逻辑。

**Rationale**：spec.md FR-012/FR-013 已明确原"设置频道"与"设置发布状态"两个独立入口合并为单一"批量发布"入口，且 Clarifications 中确认不再保留"批量撤回为草稿"的能力；因此端点不再需要支持"只改频道不发布"或"只改发布状态不改频道"这两种半途状态的组合，简化为单一发布语义，避免多余的可选参数组合。

**Alternatives considered**：保留两个独立可选字段、仅在前端 UI 层合并成一个按钮：会让后端继续暴露已废弃的调用方式（例如单独传 `isPublished: false` 撤回发布），与"精准手术式修改 + 简洁优先"原则相悖，且容易在未来被误用——拒绝。

## Decision 6：发布确认弹窗的组件复用策略

**Decision**: 笔记发布（选择频道 + 确认）、频道发布（仅确认）、批量发布（选择频道 + 确认）三处交互共用同一套"发布确认弹窗"UI 模式：一个可选渲染的频道下拉选择区块 + 统一的确认/取消按钮。频道选择区块仅在笔记发布与批量发布场景渲染，频道发布场景不渲染。

**Rationale**：三处的核心交互骨架相同（弹窗 → 可选频道选择 → 确认提交 → 处理 pending/approved 状态），复用可减少重复代码；符合"简洁优先"原则。具体拆分为几个组件文件（例如是否需要独立的 `NotePublishDialog.tsx` 与 `ChannelPublishButton.tsx`，还是进一步抽出共享的 `PublishConfirmDialog.tsx`）留给 `/speckit-tasks` 阶段按实际代码复用程度决定，本阶段只确认交互模式一致，不做过早的组件层级设计。

**Alternatives considered**：三处各自独立实现互不复用：实现简单但会有明显的重复 UI 逻辑（弹窗开关状态、loading/错误提示、fetch 调用模式），不符合项目"简洁优先"的质量门控——不作为默认方案，但不排除 tasks 阶段发现复用成本过高时退回此方案。

## 输出

所有 Technical Context 中的未知点已解决，无遗留 `NEEDS CLARIFICATION`，可进入 Phase 1 设计。
