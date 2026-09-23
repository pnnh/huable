---
description: "Task list template for feature implementation"
---

# Tasks: 笔记与频道的保存/发布分离及审核流程简化

**Input**: Design documents from `/specs/006-publish-approval-flow/`

**Prerequisites**: [plan.md](./plan.md)（必需）、[spec.md](./spec.md)（必需，含 7 个 User Story）、[research.md](./research.md)、[data-model.md](./data-model.md)、[contracts/](./contracts/)、[quickstart.md](./quickstart.md)

**Tests**: spec.md 未显式要求 TDD；本清单不新增独立的"先写测试"任务块，但对因契约变更而失效的既有测试文件（`route.test.ts`、`NotesConsole.test.tsx`）安排了对应的更新任务，并为新增的两个发布端点安排了测试任务，以满足宪法第 V 条"质量门控"。

**Organization**: 任务按 spec.md 的 7 个 User Story 分组（按优先级 P1→P2→P3 排列，而非 spec.md 文档中的原始顺序），确保每个 Story 完成后都可独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可与同阶段内的其他任务并行执行（不同文件、无未完成依赖）
- **[Story]**: 任务所属的 User Story（US1…US7），Setup/Foundational/Polish 阶段不带该标签
- 每个任务均给出仓库内的确切文件路径

## Path Conventions

单体 Next.js App Router 项目，所有路径均相对于仓库根目录 `/Users/Larry/Projects/github/huable`（页面路由、API 路由、组件同仓库，无 frontend/backend 拆分，详见 plan.md Structure Decision）。

---

## Phase 1: Setup

**Purpose**: 确认基线环境可用，作为后续所有改动的起点

- [X] T001 确认本地基线可用：`pnpm install`、`pnpm db:migrate`、`pnpm dev`、`pnpm test` 均成功运行，记录当前 `pnpm test` 通过数作为回归对比基线

---

## Phase 2: Foundational（阻塞性前置工作）

**Purpose**: 完成数据库 schema 四态扩展与存量数据迁移，并修复所有因删除 `is_public`/`is_published` 列而失效的只读查询与访问控制路径，使项目在新数据模型下可重新编译

**⚠️ CRITICAL**: 本阶段完成前不得开始任何 User Story 的工作

- [X] T002 [P] 修改 `src/db/schema.ts`：`channels` 表删除 `isPublic` 字段，`notes` 表删除 `isPublished` 字段；两表的 `approvalStatus` 的 `.$type<...>()` 由 `"pending" | "approved"` 扩展为 `"draft" | "pending" | "approved" | "rejected"`，默认值由 `"pending"` 改为 `"draft"`
- [X] T003 编写迁移文件 `migrations/0007_publish_approval_flow.sql`（依赖 T002）：按 research.md Decision 1 的映射规则回填现有行的 `approval_status`（`channels.is_public=false` 或 `notes.is_published=false`/`channel_id IS NULL` → `'draft'`，其余保留原值），再用 `migrations/0004_channel_approval.sql` 已验证过的"建新表→拷贝数据→删旧表→改名"模式移除 `is_public`/`is_published` 两列
- [X] T004 本地应用迁移并验证数据回填（依赖 T003）：运行 `pnpm db:migrate`，抽查若干存量行确认 `draft`/`pending`/`approved` 分布与迁移前的可见性结果一致
- [X] T005 [P] 修改 `src/app/[lang]/page.tsx`（依赖 T004）：公开首页笔记查询条件由 `notes.isPublished`/`channels.isPublic` 改为 `notes.approvalStatus = "approved"` 且 `channels.approvalStatus = "approved"`（`!isDev` 旁路逻辑保留，仅替换比较目标，见 research.md Decision 4）
- [X] T006 [P] 修改 `src/app/[lang]/channels/page.tsx`（依赖 T004）：频道查询条件改为 `channels.approvalStatus = "approved"`；内嵌的每频道笔记计数查询改为 `notes.approvalStatus = "approved"`
- [X] T007 [P] 修改 `src/app/[lang]/channels/[id]/page.tsx`（依赖 T004）：频道详情与其下笔记列表查询改为"笔记与所属频道均 `approved`"的复合条件
- [X] T008 [P] 修改 `src/app/[lang]/notes/[id]/page.tsx`（依赖 T004）：笔记详情查询与可见性判断改为"笔记自身与所属频道均 `approved`"的复合条件（FR-007）
- [X] T009 [P] 修改 `src/app/api/files/[noteId]/[filename]/route.ts`（依赖 T004）：任务描述在实现时修正——该文件的 `GET`（文件下载）本就没有任何审核状态校验，无需新增；真正引用了已删除 `isPublished` 字段的是 `DELETE`（删除附件）分支，其逻辑与 T016 的附件上传联动规则属同一类问题（原逻辑无条件重置为 `pending` 且缺少管理员判断，违反 FR-004）。已一并按 FR-003/FR-017 修正：删除附件视同编辑保存，将非草稿状态的笔记回退为 `draft` 并作废未处理的待审核事件，不再自动创建新事件
- [X] T010 [P] 修改 `src/app/api/console/notes/directories/route.ts`（依赖 T004）：移除 `isPublished` 字段写入，`approvalStatus` 显式写为 `"draft"`
- [X] T011 [P] 修改 `src/app/api/console/notes/upload/route.ts`（依赖 T004）：移除 `isPublished` 字段写入，`approvalStatus` 由硬编码 `"approved"` 改为 `"draft"`（对应 spec.md US5/FR-011，批量上传笔记默认未发布）
- [X] T012 [P] 修改 `src/app/api/console/channels/[channelId]/route.ts`（依赖 T004）：DELETE 前"频道下是否还有已发布笔记"的校验查询由 `notes.isPublished = true` 改为 `notes.approvalStatus = "approved"`

**Checkpoint**：数据库 schema、存量数据、全部公开页面的只读查询与附件访问控制均已在新四态模型下工作，FR-007/FR-018/SC-006 的复合可见性规则已生效。笔记/频道的**编辑保存与发布写入路径**仍引用旧字段，要到 Phase 3（User Story 1）完成后项目才会重新整体通过 TypeScript 编译——这是本次改动核心数据模型带来的正常阶段性状态，Foundational 与 User Story 1 共同构成 MVP 检查点。

---

## Phase 3: User Story 1 - 保存与发布解耦 (Priority: P1) 🎯 MVP（与 Foundational 共同构成）

**Goal**: 新增或编辑笔记/频道时，点击"保存"只写入草稿状态，不触发任何审核动作；从"已审核"“待审核"“已拒绝"状态编辑保存后统一回退为"未发布"，并按需作废原有未处理的待审核事件

**Independent Test**: 新增一篇笔记只填写标题正文并点击"保存"，验证笔记状态为"未发布"且审核列表中没有出现任何相关待审核事项；随后编辑该笔记再次"保存"，验证状态仍为"未发布"，审核列表依旧无新增记录

### Implementation for User Story 1

- [X] T013 [P] [US1] 修改 `src/app/[lang]/console/notes/[noteId]/page.tsx` 的 `handleSave`：移除对表单 `channelId`/`isPublished` 字段的读取与写入，新增/编辑统一写 `approvalStatus = "draft"`；若该笔记存在未处理（`is_handled = false`）的待审核事件，一并作废（`is_handled = true`、`handled_by = null`、`result = null`、`handled_at = now`）
- [X] T014 [P] [US1] 修改 `src/app/[lang]/console/channels/[channelId]/page.tsx` 的 `handleSave`：应用与 T013 相同的"保存即草稿 + 作废未处理事件"规则（频道场景）
- [X] T015 [P] [US1] 修改 `src/components/NoteEditorForm.tsx`：移除频道下拉选择（`channelId`）与"发布到频道"勾选框（`isPublished`）字段及相关 props/labels，仅保留标题/正文
- [X] T016 [P] [US1] 修改 `src/app/api/console/upload/route.ts`：附件上传后不再固定将笔记 `approvalStatus` 重置为 `"pending"` 并无条件创建审核事件；改为视同一次"编辑保存"，将 `approvalStatus` 回退为 `"draft"`，若存在未处理的待审核事件一并作废，且不自动创建新事件（原逻辑缺少管理员判断且违反"仅点击发布才可能生成待审核事件"的 FR-004，本次一并修正）
- [X] T017 [P] [US1] 更新 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json`：移除不再使用的 `publishToChannel` 键（确认无其他引用后再删除）

**Checkpoint**：User Story 1 完整可独立验证；项目此时重新整体通过 TypeScript 编译（所有旧字段引用已清理完毕）。

---

## Phase 4: User Story 2 - 笔记发布时选择频道 (Priority: P1)

**Goal**: 用户在笔记编辑页面点击"发布"，弹窗选择目标频道并确认后，笔记关联该频道并按角色规则进入"待审核"（非管理员）或直接"已审核"（管理员）；编辑页面本身不再提供直接设置频道的入口

**Independent Test**: 编辑一篇已保存的草稿笔记，点击"发布"，在弹窗中选择一个频道并确认，验证笔记的频道字段被更新，且（以非管理员身份操作时）在审核列表中出现一条对应的待审核事件

### Implementation for User Story 2

- [X] T018 [P] [US2] 新增 `src/app/api/console/notes/[noteId]/publish/route.ts`（实现时额外发现并修复了 `src/app/api/console/notes/[noteId]/route.ts` 的 PATCH 分支——该分支此前允许绕过发布流程直接任意设置 `channelId`；已收窄为仅允许清空频道，且清空时按 FR-003/FR-017 回退草稿并作废待审核事件）（POST）：按 `contracts/notes-publish.md` 实现——校验笔记与目标 `channelId` 均归当前用户所有；管理员 → `approvalStatus = "approved"` 且不建事件，非管理员 → `approvalStatus = "pending"` 且创建 `approval_events` 行（首次发布 `action="created"`，此前有过发布记录则 `action="updated"`）；若存在未处理的待审核事件一并作废
- [X] T019 [P] [US2] 新增 `src/components/NotePublishDialog.tsx`：发布弹窗组件（频道下拉选择 + 确认/取消按钮，未选择频道时确认按钮禁用或提示）
- [X] T020 [US2] 修改 `src/app/[lang]/console/notes/[noteId]/page.tsx`（依赖 T013、T018、T019）：非新增页面的工具栏"保存"按钮旁新增"发布"按钮，接入 `NotePublishDialog`，确认后调用 T018 新增的发布端点；新增页面不展示该按钮
- [X] T021 [P] [US2] 更新 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json`：新增笔记发布相关文案（"发布"按钮、弹窗标题、"请选择频道"校验提示）

**Checkpoint**：User Story 1 + 2 均可独立验证；笔记可以走完整"保存 → 发布 → （管理员批准）→ 公开页面可见"链路。

---

## Phase 5: User Story 3 - 频道发布审核 (Priority: P2)

**Goal**: 用户在频道编辑页面点击"发布"，弹出二次确认弹窗，确认后频道按角色规则进入"待审核"或直接"已审核"，决定该频道是否对公众可见

**Independent Test**: 编辑一个已保存的草稿频道，点击"发布"，验证非管理员操作后频道状态变为"待审核"并生成待审核事件；管理员操作后状态直接变为"已审核"

### Implementation for User Story 3

- [X] T022 [P] [US3] 新增 `src/app/api/console/channels/[channelId]/publish/route.ts`（POST）：按 `contracts/channels-publish.md` 实现——校验频道归当前用户所有；管理员 → `approvalStatus = "approved"` 且不建事件，非管理员 → `approvalStatus = "pending"` 且创建 `approval_events` 行；若存在未处理的待审核事件一并作废
- [X] T023 [P] [US3] 新增 `src/components/ChannelPublishButton.tsx`："发布"按钮 + 二次确认弹窗（仅确认/取消，无表单输入），点击取消不得发起任何请求
- [X] T024 [US3] 修改 `src/app/[lang]/console/channels/[channelId]/page.tsx`（依赖 T014、T022、T023）：非新增页面的工具栏"保存"按钮旁新增 `ChannelPublishButton`，确认后调用 T022 新增的发布端点；新增页面不展示该按钮
- [X] T025 [P] [US3] 更新 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json`：新增频道发布二次确认弹窗文案（同时清理了因移除 `isPublic` 复选框而失去引用的 `makeChannelPublic` 键）

**Checkpoint**：User Story 1-3 均可独立验证。

---

## Phase 6: User Story 4 - 笔记列表批量发布 (Priority: P2)

**Goal**: 用户在笔记控制台列表页勾选多篇笔记，点击合并后的"批量发布"入口，在弹出的频道选择框中确认目标频道后，系统为所有选中笔记统一设置该频道并按发布规则提交审核（或管理员直接通过）

**Independent Test**: 在笔记列表勾选 3 篇草稿笔记，点击"批量发布"，选择某频道并确认，验证这 3 篇笔记的频道与状态均按单篇发布规则更新，其余未勾选笔记不受影响

### Implementation for User Story 4

- [X] T026 [P] [US4] 修改 `src/app/api/console/notes/batch/route.ts`：按 `contracts/notes-batch-publish.md` 将请求体收敛为 `{ noteIds: string[], channelId: string }`（`channelId` 必填，移除 `isPublished` 字段支持），对每条笔记逐条应用发布规则（管理员 → `approved` 不建事件；非管理员 → `pending` 并逐条创建独立的 `approval_events` 行），并逐条作废已存在的未处理事件；跳过规则（`not_found`/`not_owned`/`is_directory`）与响应结构不变
- [X] T027 [US4] 更新 `src/app/api/console/notes/batch/route.test.ts`（依赖 T026）：按新契约重写测试用例（必填 `channelId`、逐条发布规则的管理员/非管理员分支、`updated`/`skipped` 结构不变）
- [X] T028 [P] [US4] 修改 `src/components/NotesBatchToolbar.tsx`：合并原"设置频道"与"设置发布状态"两个按钮为单一"批量发布"按钮，复用频道选择弹窗（交互模式可参考 `NotePublishDialog`，无需强制共用同一组件，见 research.md Decision 6）
- [X] T029 [US4] 修改 `src/app/[lang]/console/notes/page.tsx`（依赖 T028）：更新传给 `NotesBatchToolbar` 的 labels，移除 `setChannel`/`setPublishStatus`，改为单一 `batchPublish` 标签
- [X] T030 [US4] 更新 `src/components/NotesConsole.test.tsx`（依赖 T028、T029）：调整断言以匹配合并后的单一"批量发布"按钮（原"两个批量操作按钮"相关用例需改写）
- [X] T031 [P] [US4] 更新 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json`：新增 `batchPublish` 键；`setChannel`/`setPublishStatus` 经核实从未被添加到任何语言文件（属 specs/005 遗留的既有缺口，非本次引入），无需移除。顺带补齐了同一批组件早已引用但同样缺失的 `selectAllNotes`/`selectNote`/`batchUpdateSuccess`/`batchUpdatePartial`/`batchUpdateFailed`/`uploadNotes`（否则 `console/notes/page.tsx` 无法通过类型检查）

**Checkpoint**：User Story 1-4 均可独立验证。

---

## Phase 7: User Story 6 - 拒绝后重新编辑发布 (Priority: P2)

**Goal**: 管理员拒绝一条待审核事件后，对应笔记/频道进入独立的"已拒绝"状态；所有者可在编辑页面看到拒绝标记，编辑内容并点击"保存"后状态转为"未发布"，之后可重新点击"发布"提交审核

**Independent Test**: 管理员对一条待审核事件点击"拒绝"，验证对应笔记/频道状态变为"已拒绝"且不再出现在公开列表；所有者编辑该内容并点击"保存"，验证状态变为"未发布"；所有者再次点击"发布"，验证可重新生成新的待审核事件

### Implementation for User Story 6

- [X] T032 [P] [US6] 修改 `src/app/api/console/approvals/[eventId]/route.ts`：`reject` 分支新增回写对应笔记/频道 `approval_status = "rejected"`（现状代码只更新了 `approval_events.result`，从未回写实体状态，导致被拒绝内容永远停留在 `pending`，本次修正；`approve` 分支行为不变）
- [X] T033 [P] [US6] 修改 `src/app/[lang]/console/notes/[noteId]/page.tsx`（依赖 T013、T032）：编辑页面在 `approvalStatus = "rejected"` 时展示"已拒绝"标记
- [X] T034 [P] [US6] 修改 `src/app/[lang]/console/channels/[channelId]/page.tsx`（依赖 T014、T032）：编辑页面在 `approvalStatus = "rejected"` 时展示"已拒绝"标记
- [X] T035 [P] [US6] 更新 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json`：新增"已拒绝"状态文案

**Checkpoint**：User Story 1-4、6 均可独立验证；完整的"发布 → 拒绝 → 重新编辑 → 再次发布"闭环可跑通。

---

## Phase 8: User Story 5 - 批量上传笔记保持草稿态 (Priority: P3，回归验证)

**Goal**: 通过批量上传 Markdown 文件创建的笔记，必须与手动新增单篇笔记保持一致的默认行为：不关联任何频道，状态为"未发布"，不产生任何审核事件

**Independent Test**: 通过批量上传创建若干篇笔记，验证每篇笔记的频道字段为空、状态为"未发布"，审核列表中没有出现与这些笔记相关的记录

### Implementation for User Story 5

- [X] T036 [P] [US5] 新增/更新 `src/app/api/console/notes/upload/route.test.ts`（依赖 T011）：验证上传创建的笔记 `approvalStatus = "draft"`、`channelId` 为空、未生成 `approval_events` 记录
- [X] T037 [US5] 按 `quickstart.md` 场景 6 走查批量上传流程：T036 的自动化测试已验证新上传笔记为草稿/无频道/无审核事件；额外用 sqlite3 检查本地开发库确认迁移前的存量数据未受影响，与预期一致

**Checkpoint**：User Story 1-4、5、6 均可独立验证。

---

## Phase 9: User Story 7 - 查看审核发布状态标识 (Priority: P3)

**Goal**: 用户在笔记/频道的编辑页面，以及控制台的笔记/频道列表页面，都能看到清晰的状态标识，反映内容当前处于"未发布"“待审核"“已审核"或"已拒绝"中的哪一种状态

**Independent Test**: 分别将一篇笔记置于四种状态之一，打开其编辑页面与所在的控制台列表页面，验证两处展示的状态标识与该笔记的实际 `approvalStatus` 一致；对频道重复同样验证

### Implementation for User Story 7

- [X] T038 [P] [US7] 新增 `src/components/ApprovalStatusBadge.tsx`：接收四态 `approvalStatus`，渲染对应颜色与文案的状态徽标
- [X] T039 [US7] 修改 `src/components/NotesTreeTable.tsx`（依赖 T038）：笔记行状态列从 `isPublished` 布尔判断改用 `ApprovalStatusBadge` + `note.approvalStatus`
- [X] T040 [US7] 修改 `src/app/[lang]/console/notes/page.tsx`（依赖 T039）：传给 `NotesTreeTable` 的笔记数据字段由 `isPublished` 改为 `approvalStatus`
- [X] T041 [P] [US7] 修改 `src/app/[lang]/console/channels/page.tsx`（依赖 T038）：频道列表状态列从 `ch.isPublic` 判断改用 `ApprovalStatusBadge` + `ch.approvalStatus`
- [X] T042 [P] [US7] 修改 `src/app/[lang]/console/channels/[channelId]/notes/page.tsx`（依赖 T038）：频道下笔记列表状态列从 `note.isPublished` 判断改用 `ApprovalStatusBadge` + `note.approvalStatus`
- [X] T043 [P] [US7] 修改 `src/app/[lang]/console/notes/[noteId]/page.tsx`（依赖 T038、T033）：编辑页面顶部展示 `ApprovalStatusBadge`（四态全覆盖，整合/替换 T033 的"已拒绝"专用文案）
- [X] T044 [P] [US7] 修改 `src/app/[lang]/console/channels/[channelId]/page.tsx`（依赖 T038、T034）：编辑页面顶部展示 `ApprovalStatusBadge`（整合/替换 T034 的"已拒绝"专用文案）
- [X] T045 [US7] 更新 `src/components/NotesConsole.test.tsx`（依赖 T039、T030）：补充/调整断言以覆盖 `approvalStatus` 四态徽标渲染，替换测试夹具中的 `isPublished` 字段
- [X] T046 [P] [US7] 更新 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json`：新增四态徽标完整文案集（未发布/待审核/已审核/已拒绝），与 T035 新增的"已拒绝"键去重合并

**Checkpoint**：全部 7 个 User Story 均可独立验证。

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 影响多个 User Story 的收尾工作

- [X] T047 [P] 更新根目录 `README.md` 的 Database Schema 表格与 Features 描述：移除 `is_public`/`is_published`，补充四态 `approval_status` 与"保存/发布分离"模型说明
- [X] T048 运行 `pnpm test`，确认全部测试通过（依赖 Phase 3-9 全部任务）——38/38 通过（基线 34/34，新增 4 个：批量发布契约测试扩充、笔记上传草稿态回归测试、状态徽标渲染测试）
- [X] T049 运行 `pnpm build`（依赖 T048）——首次运行**未能完全通过**：`src/app/[lang]/console/notes/upload/page.tsx`（spec 004 批量上传页面）引用了 15 个从未被添加到任何语言文件的翻译键，且其中 `statusPending` 与本功能新增的四态徽标键存在语义冲突（"待上传" vs "待审核"），当时判断为超出本功能范围而未处理。后经 `/speckit-analyze` 发现并标记为 G1，已在 T055 中一并修复（重命名冲突键 + 补全缺失键）。**现已整体通过**：`pnpm build` 成功产出全部 84 条路由。
- [X] T050 按 `quickstart.md` 场景针对性走查（依赖 T048；发现已运行中的 dev server 占用 7500 端口，改为直接对其发真实请求 + 临时测试数据验证，而非重新起服务）：
  - 场景 1：`/en/console/notes/new`、`/en/console/channels/new` 渲染正常且不显示"发布"按钮；`/en/console/notes`、`/en/console/channels` 渲染正常且分别显示合并后的"Batch Publish"与新建按钮 —— PASS
  - 场景 2/4：以普通用户 POST `/api/console/notes/{id}/publish` 关联频道后状态变为 `pending` 并生成待审核事件；以管理员 POST 频道/笔记发布端点直接变为 `approved` 且不生成事件 —— PASS
  - 场景 3：POST `/api/console/channels/{id}/publish` 按角色分别进入 `pending`/`approved` —— PASS
  - 场景 5：POST `/api/console/notes/batch` 携带 `channelId` 对多篇笔记生效，`updated`/`skipped` 结构正确 —— PASS
  - 场景 6：T036 自动化测试 + 本地库存量数据抽查 —— PASS（见 T037）
  - 场景 7/8：管理员 PATCH `/api/console/approvals/{eventId}` reject 后笔记状态变为 `rejected`，编辑页正确显示"Rejected"徽标与拒绝提示文案 —— PASS
  - 场景 9：`/en/console/notes`、`/en/console/channels` 列表与两个编辑页均正确显示四态状态徽标 —— PASS
  - 全部临时测试数据（用户/频道/笔记/待审核事件）已在验证后清理，未污染本地数据库
  - `pnpm test` 复跑仍 38/38 通过，未因上述真实请求产生回归

---

## Phase 11: /speckit-analyze 修复（C1/E1/D1/F1/G1）

**Purpose**：修复 `/speckit-analyze` 发现的 5 项问题

- [X] T051 [P] 修复 **C1**（CRITICAL）：`src/app/api/files/[noteId]/[filename]/route.ts` 的 `GET` 分支原先没有任何审核状态校验，任何人凭 URL 即可下载未审核/待审核/已拒绝笔记的附件。新增校验：所有者/管理员可随时访问；其余请求者仅当笔记与所属频道均为 `approved`（生产环境，`!isDev` 沿用既有本地旁路约定）才可访问，否则 404
- [X] T052 [P] 修复 **E1**（HIGH）：新增 `src/app/api/files/[noteId]/[filename]/route.test.ts`（7 用例，覆盖匿名/所有者/他人/管理员 × 四态）、`src/app/api/console/notes/[noteId]/publish/route.test.ts`（6 用例）、`src/app/api/console/channels/[channelId]/publish/route.test.ts`（4 用例），补齐管理员免审 vs 非管理员待审核分支的自动化回归覆盖
- [X] T053 [P] 修复 **D1**（LOW）：删除 T025 描述中复制粘贴产生的重复分句
- [X] T054 [P] 修复 **F1**（LOW）：在 `plan.md` 的 Source Code 结构树中补充实现阶段新发现的两个文件（`notes/[noteId]/route.ts`、`files/[noteId]/[filename]/route.ts`）
- [X] T055 修复 **G1**（MEDIUM，跨越 spec 004/005 既有缺口）：`src/components/NoteUploadQueue.tsx` 与 `src/app/[lang]/console/notes/upload/page.tsx` 的 `statusPending`/`statusUploading`/`statusSuccess`/`statusFailed` 改名为 `uploadStatus*` 前缀，避免与本功能的四态徽标键语义冲突（"待上传" vs "待审核"）；补全 `selectFiles`/`startUpload`/`queueFileName`/`queueExtension`/`queueSize`/`queueModified`/`queueActions`/`removeFile`/`queueFull`/`fileTooLarge`/`invalidFileType`/`uploadFailedGeneric` 等此前从未添加到任何语言文件的翻译键。已验证 `pnpm build` 整体转绿（含全部 84 条路由，`/api/console/notes/[noteId]/publish`、`/api/console/channels/[channelId]/publish`、`/api/files/[noteId]/[filename]` 均正确编译）

**Checkpoint**：`pnpm test` 全量通过；`pnpm build` 整体转绿；`/speckit-analyze` 的 5 项发现全部闭环。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：无依赖，可立即开始
- **Foundational (Phase 2)**：依赖 Setup 完成；阻塞全部 User Story
- **User Story 1 (Phase 3)**：依赖 Foundational；是 MVP 的必要组成部分（Foundational 单独完成时项目尚不能整体编译）
- **User Story 2 (Phase 4)**：依赖 Foundational + User Story 1（笔记编辑页 `handleSave` 须先清理完毕，发布按钮才有插入位置）
- **User Story 3 (Phase 5)**：依赖 Foundational + User Story 1（频道编辑页同理）；与 User Story 2 相互独立，可并行开发
- **User Story 4 (Phase 6)**：依赖 Foundational；不依赖 User Story 2/3 的 UI（批量发布是独立入口），但复用与 User Story 2 相同的"频道选择"交互模式，建议在 User Story 2 之后实施以便复用经验
- **User Story 6 (Phase 7)**：依赖 Foundational + User Story 1；不依赖 User Story 2/3/4，可并行开发
- **User Story 5 (Phase 8)**：依赖 Foundational（T011）；仅为回归验证，可在任意 User Story 之后独立执行
- **User Story 7 (Phase 9)**：依赖 Foundational；实际展示"已拒绝"状态前需要 User Story 6 已产出该状态（T033/T034），故安排在 User Story 6 之后
- **Polish (Phase 10)**：依赖全部期望交付的 User Story 完成

### Parallel Opportunities

- Foundational 阶段的 T005-T012（8 个只读查询/访问控制修复）在 T004 完成后可全部并行
- User Story 1 的 T013-T017（5 个任务）互相独立，可全部并行
- User Story 2 的 T018、T019、T021 可并行；T020 需等待三者及前置 Story 完成
- User Story 3 的 T022、T023、T025 可并行；T024 需等待三者及前置 Story 完成
- User Story 2 与 User Story 3 两个 Phase 之间也可并行开发（不同文件、不同端点）
- User Story 6 与 User Story 4 可并行开发（不同文件）
- 每个 Phase 内标记 `[P]` 的任务均可并行；未标记的任务存在同阶段内的文件/顺序依赖，需按列出顺序执行

---

## Parallel Example: User Story 1（MVP）

```bash
# Foundational 完成后，User Story 1 的全部任务可一次性并行发起：
Task: "修改 src/app/[lang]/console/notes/[noteId]/page.tsx 的 handleSave"
Task: "修改 src/app/[lang]/console/channels/[channelId]/page.tsx 的 handleSave"
Task: "修改 src/components/NoteEditorForm.tsx，移除频道/发布字段"
Task: "修改 src/app/api/console/upload/route.ts 的附件上传状态联动逻辑"
Task: "更新 src/locales/{en,es,fr,zh}.json，移除 publishToChannel 键"
```

## Parallel Example: Foundational 只读路径修复

```bash
# T004（迁移应用+验证）完成后，以下 8 个任务可一次性并行发起：
Task: "修改 src/app/[lang]/page.tsx 的公开首页查询"
Task: "修改 src/app/[lang]/channels/page.tsx 的频道列表查询"
Task: "修改 src/app/[lang]/channels/[id]/page.tsx 的频道详情查询"
Task: "修改 src/app/[lang]/notes/[id]/page.tsx 的笔记详情查询"
Task: "修改 src/app/api/files/[noteId]/[filename]/route.ts 的附件访问校验"
Task: "修改 src/app/api/console/notes/directories/route.ts 的目录创建默认值"
Task: "修改 src/app/api/console/notes/upload/route.ts 的上传默认值"
Task: "修改 src/app/api/console/channels/[channelId]/route.ts 的删除前校验"
```

---

## Implementation Strategy

### MVP First（Foundational + User Story 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（**关键**——阻塞全部 User Story）
3. 完成 Phase 3: User Story 1
4. **停下并验证**：运行 `pnpm build`（此时项目应重新整体编译通过）+ 手动走查 quickstart.md 场景 1
5. 视需要部署/演示

### Incremental Delivery

1. Setup + Foundational + User Story 1 → 基础就绪，MVP 可用（保存/发布已解耦，但尚无发布入口）
2. 加入 User Story 2（笔记发布）→ 独立验证 → 演示
3. 加入 User Story 3（频道发布）→ 独立验证 → 演示
4. 加入 User Story 4（批量发布）→ 独立验证 → 演示
5. 加入 User Story 6（拒绝后重新编辑）→ 独立验证 → 演示
6. 加入 User Story 5（批量上传回归验证）→ 独立验证
7. 加入 User Story 7（状态标识）→ 独立验证 → 演示
8. Polish（Phase 10）收尾

### Parallel Team Strategy

Foundational 完成后：

- 开发者 A：User Story 1 → User Story 2
- 开发者 B：User Story 3 → User Story 4
- 开发者 C：User Story 6 → User Story 5 → User Story 7（依赖 US6 产出"已拒绝"状态，需等待 A 完成 US1 后再开始）

---

## Notes

- `[P]` 任务 = 不同文件、无未完成依赖
- `[Story]` 标签用于将任务追溯到具体 User Story
- 每个 User Story 阶段完成后都应能独立完成 spec.md 中对应的 Acceptance Scenarios
- 每个任务或每组逻辑相关的任务完成后建议提交一次
- 可在任意 Checkpoint 处停下，独立验证对应 Story
- 避免：模糊任务、同一文件的并行冲突任务、破坏 Story 独立性的跨 Story 硬依赖
- Foundational 阶段刻意保持"只读查询修复"与"编辑/发布写入路径实现"分离（后者属于 User Story 1/2/3/4），项目会在 Foundational 结束到 User Story 1 结束之间短暂处于编译失败状态，这是本次改动核心数据模型的预期过程，不构成需要额外任务弥补的缺口
