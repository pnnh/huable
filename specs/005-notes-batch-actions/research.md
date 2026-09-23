# Phase 0 Research: 笔记批量设置频道与发布状态

本功能建立在已有笔记列表页（[page.tsx](../../src/app/%5Blang%5D/console/notes/page.tsx)）、
[NotesTreeTable.tsx](../../src/components/NotesTreeTable.tsx)、数据模型（`notes`/`channels` 表，见
[schema.ts](../../src/db/schema.ts)）及单笔记编辑页（`[noteId]/page.tsx`）之上，技术栈与运行环境均已确定，
Technical Context 中无遗留 `NEEDS CLARIFICATION`。以下记录几项需要在开工前定下来的实现层决策。

## 决策 1：批量更新 API 的接口形态

- **Decision**: 新增单一端点 `POST /api/console/notes/batch`，请求体为
  `{ noteIds: string[], channelId?: string | null, isPublished?: boolean }`，`channelId` 与
  `isPublished` 均为可选字段，按"存在则更新"的语义各自独立生效（与现有
  `PATCH /api/console/notes/[noteId]` 的 `"channelId" in body` 局部更新写法一致）。
- **Rationale**: 两个工具栏按钮（"设置频道""设置发布状态"）本质上是同一批量更新能力的两种入参组合，
  拆成两个端点会重复鉴权、所有权校验、审批状态重算逻辑；单一端点复用度更高，符合宪法"简洁优先"原则。
- **Alternatives considered**:
  - 按字段拆分为 `POST /api/console/notes/batch/channel` 与
    `POST /api/console/notes/batch/publish-status` 两个端点：逻辑更直白，但会复制大量重复代码（鉴权、
    所有权过滤、逐条审批状态重算），被否决。
  - 复用现有 `PATCH /api/console/notes/[noteId]` 循环调用 N 次：前端需自行处理部分失败与并发限流，
    且现有端点不支持 `isPublished` 字段，仍需改造；不如新增一个专职批量端点清晰，被否决。

## 决策 2：批量更新时的审批状态（approvalStatus）重算规则

- **Decision**: 沿用单笔记编辑页现有规则——当笔记的最终频道非空且最终发布状态为"已发布"时，
  `approvalStatus` 置为 `"pending"`，否则置为 `"approved"`。批量更新时，"最终值"取本次请求提供的新值
  （若该字段未在请求中出现，则取该笔记更新前的已有值），因此需要逐条读取每篇笔记当前的
  `channelId`/`isPublished`，再计算出该笔记本次应有的 `approvalStatus`。
- **Rationale**: 保持批量操作与单条编辑的业务规则完全一致，避免绕过既有审批流程（宪法原则 VI：
  不得改变现有权限与审批语义）。
- **Alternatives considered**:
  - 批量更新时统一跳过审批状态重算，只改 `channelId`/`isPublished`：会导致笔记以"已批准"状态错误地
    公开展示未经审批的频道内容，构成对既有审批语义的破坏，被否决。
  - 批量更新一律将 `approvalStatus` 重置为 `"pending"`：对仅批量清空频道（不发布）的场景也会误置为待审批，
    与单条编辑规则不一致，被否决。

## 决策 3：勾选状态的承载位置

- **Decision**: 新增一个客户端容器组件 `NotesConsole`，在其中以 `useState<Set<string>>` 持有当前勾选的
  笔记 id 集合，同时渲染批量工具栏按钮与 `NotesTreeTable`（改造后接受
  `selectedIds` / `onToggleRow` / `onToggleAll` 等受控 props）。`page.tsx` 保持服务端组件，只负责查询
  `notes`、`channels` 数据并传给 `NotesConsole`。
- **Rationale**: `page.tsx` 是 Server Component，无法持有交互状态；勾选状态需要被工具栏按钮（是否禁用）
  和表格（复选框勾选态、表头全选态）同时读写，必须提升到两者共同的客户端父组件。
- **Alternatives considered**:
  - 用 React Context 跨组件共享勾选状态：对当前组件树深度（页面 → 容器 → 表格）而言是不必要的抽象，
    props 透传已经足够清晰，被否决（避免过度设计）。
  - 把勾选状态放进 URL 查询参数：可持久化跨刷新的勾选状态，但超出本功能"单次会话内批量操作"的诉求，
    且与 spec 中"切换目录层级即清空勾选"的假设不符，被否决。

## 决策 4：勾选范围与懒加载子目录的关系

- **Decision**: 表头全选仅作用于当前已加载并展示在页面上的笔记行（当前层级 + 已展开的子目录行）；
  折叠目录或切换 `parentId` 导航时清空所有勾选状态。该决策已在 spec.md 的 Assumptions 中明确，
  Phase 0 仅确认其在技术上可行——`NotesTreeTable` 的 `TreeRow` 已经用本地 state 管理展开/子节点加载，
  勾选状态可作为同层级的受控 props 随子节点渲染一并向下传递，无需额外的全局笔记索引。
- **Rationale**: 与现有懒加载子目录的实现方式（`fetch children` 才挂载子行）保持一致，不需要预先加载
  整棵笔记树，避免引入不必要的性能开销。
- **Alternatives considered**: 无（该决策已在 spec 阶段由 Assumptions 固定，此处仅做技术可行性确认）。

## 结论

以上四项决策覆盖了 Technical Context 中原本可能存在的开放问题；不存在需要转入 `research spike` 或
外部技术选型评估的未知项。可以进入 Phase 1 设计。
