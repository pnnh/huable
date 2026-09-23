---

description: "Task list template for feature implementation"
---

# Tasks: 笔记批量设置频道与发布状态

**Input**: Design documents from `/specs/005-notes-batch-actions/`

**Prerequisites**: [plan.md](./plan.md)（必需）、[spec.md](./spec.md)（用户故事）、[research.md](./research.md)、
[data-model.md](./data-model.md)、[contracts/batch-update.md](./contracts/batch-update.md)、
[quickstart.md](./quickstart.md)

**Tests**: spec.md 未显式要求 TDD，因此各用户故事阶段不包含强制"先写测试"子阶段；测试任务集中在
Phase 6 Polish 中按项目既有 Vitest 约定补充。

**Organization**: 任务按用户故事分组，US3（复选框/全选机制）是 US1、US2 的前置 UI 能力，故排在最前；
US1、US2 均依赖 Foundational 阶段建立的统一批量 API 端点。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无先决依赖）
- **[Story]**: 任务所属用户故事（US1/US2/US3）
- 每个任务均给出精确文件路径

## Path Conventions

单一 Next.js 项目，源码位于仓库根目录 `src/`（无 frontend/backend 拆分），详见 plan.md 的 Project Structure。

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 为批量操作相关 UI 补充多语言文案，供后续所有阶段引用

- [X] T001 [P] 在 src/locales/en.json 中新增批量操作相关文案 key（如 setChannel、setPublishStatus、selectChannelPrompt、noChannel、markPublished、markDraft、batchUpdateSuccess、batchUpdatePartial、batchUpdateFailed、noChannelsAvailable 等，命名需与 T007–T015 中实际使用的 key 保持一致）
- [X] T002 [P] 在 src/locales/zh.json 中新增与 T001 相同 key 的简体中文文案
- [X] T003 [P] 在 src/locales/es.json 中新增与 T001 相同 key 的西班牙语文案
- [X] T004 [P] 在 src/locales/fr.json 中新增与 T001 相同 key 的法语文案

**Checkpoint**: 四个语言文件的 key 集合一致，`t(l, key)` 在后续组件中可直接使用。

---

## Phase 2: Foundational（阻塞性前置工作）

**Purpose**: 建立 US1、US2 共用的批量更新 API 端点（按 contracts/batch-update.md 与 data-model.md 的规则实现）

**⚠️ CRITICAL**: US1、US2 的弹窗提交逻辑依赖本阶段产出的端点；US3 的纯前端选择机制不依赖本阶段，可与本阶段并行开发

- [X] T005 在 src/app/api/console/notes/batch/route.ts 中实现 `POST` 处理函数的请求校验：调用 `requireConsoleAuth()`；校验 `noteIds`（非空数组、长度 ≤200，否则 400 `note_ids_required`/`too_many_notes`）；校验 `channelId`/`isPublished` 至少提供一个（否则 400 `no_updates_provided`）；当 `channelId` 为非空字符串时校验其属于当前用户的 channels（否则 400 `channel_not_found`），`channelId === null` 时跳过该校验（参见 contracts/batch-update.md 校验步骤 1–4）
- [X] T006 在 src/app/api/console/notes/batch/route.ts 中实现逐条笔记处理逻辑（依赖 T005，同文件顺序执行）：按 `noteIds` 查询 `notes` 表，对不存在 / `userId` 不匹配 / `mimeType === "directory"` 的记录分别记为 `skipped: {id, reason: "not_found"|"not_owned"|"is_directory"}`；其余记录按 data-model.md 的派生规则计算 `finalChannelId`/`finalIsPublished`/`approvalStatus`，批量写入 `channelId`/`isPublished`/`approvalStatus`/`updatedAt`，成功的 id 加入 `updated`；最终返回 `{ updated, skipped }`（200）

**Checkpoint**: `POST /api/console/notes/batch` 端点行为完全符合 contracts/batch-update.md（可用 quickstart.md 场景 6 的 curl 方式手动验证 not_owned 分支）。

---

## Phase 3: User Story 3 - 复选框勾选与全选笔记 (Priority: P1) 🎯 前置能力

**Goal**: 笔记列表每行左侧与表头出现复选框，仅笔记可勾选（目录不可勾选），表头复选框支持全选/取消全选/部分选中态，勾选状态驱动工具栏两个批量按钮的禁用/启用。

**Independent Test**: 按 quickstart.md 场景 1、2、5 手动验证——目录行无复选框；点击表头复选框可一键全选/取消全选当前视图笔记且不影响目录；切换目录层级后选中状态清空、按钮恢复禁用。

### Implementation for User Story 3

- [X] T007 [US3] 扩展 src/components/NotesTreeTable.tsx 的 `NoteTreeItem`/`NotesTreeTableProps` 类型与表头渲染：新增 `selectedIds: Set<string>`、`onToggleRow: (id: string) => void`、`onToggleAll: () => void`、`headerState: "all" | "partial" | "none"` 等受控 props；在 `<thead>` 新增复选框列，`headerState === "partial"` 时将原生 `<input>` 的 `indeterminate` 属性设为 true
- [X] T008 [US3] 修改 src/components/NotesTreeTable.tsx 的 `TreeRow`（依赖 T007，同文件顺序执行）：仅当 `item.mimeType !== "directory"` 时在行首渲染受控复选框并绑定 `onToggleRow(item.id)`、`checked={selectedIds.has(item.id)}`；目录行渲染等宽占位（不出现复选框）；`TreeRow` 递归渲染子节点（懒加载的 `children`）时透传 `selectedIds`/`onToggleRow` 等 props，实现展开后子笔记同样可勾选
- [X] T009 [P] [US3] 新增 src/components/NotesBatchToolbar.tsx：接收 `selectedCount: number`、`disabled: boolean` 等 props，渲染"设置频道""设置发布状态"两个按钮，`selectedCount === 0` 时两个按钮均为 `disabled`；本任务仅实现按钮壳与禁用态，弹窗内容留给 T013、T015 补全（先占位为空函数或 TODO 注释）
- [X] T010 [US3] 新增 src/components/NotesConsole.tsx 客户端容器组件（依赖 T007–T009）：props 包含 `items: NoteTreeItem[]`、`channels: {id: string; name: string}[]`、`labels`、`children`（用于承接 page.tsx 中既有的"新建目录/上传笔记/新建笔记"工具栏内容）；内部用 `useState<Set<string>>` 管理 `selectedIds`，实现 `toggleRow`/`toggleAll`（按当前 `items` 中所有非目录 id 计算全选/取消全选）/清空逻辑；渲染顺序为：工具栏行（`children` 与 `<NotesBatchToolbar>` 并列展示）→ 列表为空提示或 `<NotesTreeTable>`；当 `items` 引用变化（对应 `parentId` 导航或目录折叠导致的重渲染）时清空 `selectedIds`
- [X] T011 [US3] 修改 src/app/[lang]/console/notes/page.tsx（依赖 T010）：将 `CreateDirectoryDialog`、上传笔记链接、新建笔记链接作为 `children` 传入新的 `<NotesConsole>`；把原先直接渲染的 `treeItems.length === 0 ? <p>...</p> : <NotesTreeTable ... />` 逻辑移入 `NotesConsole` 内部渲染，`page.tsx` 只保留数据查询与顶层布局

**Checkpoint**: User Story 3 可独立通过 quickstart.md 场景 1、2、5 验证（此时"设置频道""设置发布状态"按钮可见、可正确禁用/启用，但点击后暂无实际弹窗/提交效果，属预期状态）。

---

## Phase 4: User Story 1 - 批量设置笔记所属频道 (Priority: P1)

**Goal**: 勾选若干笔记后点击"设置频道"，从当前用户拥有的频道（或"无频道"）中选择一个目标频道并一次性应用到所有选中笔记。

**Independent Test**: 按 quickstart.md 场景 3、6 手动验证——批量设置频道后列表刷新显示新频道名称，未勾选笔记不受影响；对不属于当前用户的笔记 id 调用端点应返回 `skipped: not_owned` 而不修改数据。

### Implementation for User Story 1

- [X] T012 [US1] 修改 src/app/[lang]/console/notes/page.tsx（依赖 T011）：参照 src/app/[lang]/console/notes/[noteId]/page.tsx 中 `db.select().from(channels).where(eq(channels.userId, user.id))` 的写法，查询当前用户的 channels 列表，作为 `channels` prop 传给 `NotesConsole`
- [X] T013 [US1] 在 src/components/NotesBatchToolbar.tsx 中实现"设置频道"弹窗（依赖 T009、T012）：列出传入的 `channels` 及"无频道"选项，确认后 `fetch("/api/console/notes/batch", { method: "POST", body: JSON.stringify({ noteIds: [...selectedIds], channelId }) })`；成功响应中若 `skipped.length > 0` 按 contracts/batch-update.md 的"前端消费约定"提示部分失败原因，`updated.length > 0` 时调用 `router.refresh()` 并清空选中态；非 2xx 响应提示通用失败文案且不清空选中态
- [X] T014 [P] [US1] 完成 src/app/api/console/notes/batch/route.ts 中 `channelId` 分支的边界处理（依赖 T006，可与 T013 并行开发）：确认弹窗传入 `channelId: null`（"无频道"）与省略 `channelId` 字段两种情况在端点中语义不同（前者清空频道，后者不修改频道），必要时在 T005/T006 基础上补齐该区分逻辑

**Checkpoint**: User Story 1 完整可用，可独立通过 quickstart.md 场景 3、6 验证。

---

## Phase 5: User Story 2 - 批量设置笔记发布状态 (Priority: P2)

**Goal**: 勾选若干笔记后点击"设置发布状态"，在"已发布"与"草稿"之间选择一个目标状态并一次性应用到所有选中笔记。

**Independent Test**: 按 quickstart.md 场景 4 手动验证——批量设置为已发布/草稿后，列表中对应笔记状态标签正确更新（若笔记同时关联频道，进入待审批状态与单条编辑页行为一致）。

### Implementation for User Story 2

- [X] T015 [US2] 在 src/components/NotesBatchToolbar.tsx 中实现"设置发布状态"弹窗（依赖 T013，同文件顺序执行）：提供"已发布"/"草稿"两个选项，确认后 `fetch("/api/console/notes/batch", { method: "POST", body: JSON.stringify({ noteIds: [...selectedIds], isPublished }) })`，复用 T013 已实现的响应处理（updated/skipped 提示、`router.refresh()`、清空选中态）逻辑

**Checkpoint**: 三个用户故事均可独立验证，功能整体完整（quickstart.md 全部场景可执行）。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 补充自动化测试、跑通项目质量门禁、完成端到端手动验收

- [X] T016 [P] 为 src/components/NotesConsole.tsx 与 src/components/NotesTreeTable.tsx 的复选框可见性（目录行无复选框）、全选/部分选/取消全选、按钮禁用态编写 Vitest + Testing Library 测试，新增 src/components/NotesConsole.test.tsx（参照现有 src/components/ToolGrid.test.tsx 的写法）
- [X] T017 [P] 为 src/app/api/console/notes/batch/route.ts 编写 Vitest 单元测试，新增 src/app/api/console/notes/batch/route.test.ts，覆盖 `skipped` 的 `not_found`/`not_owned`/`is_directory` 三种分支以及 approvalStatus 重算规则（channelId 非空且 isPublished=true ⇒ pending，其余 ⇒ approved）
- [X] T018 运行 `pnpm test`（全量 Vitest）与项目已有的构建/类型检查脚本，修复因本功能引入的失败或告警
- [ ] T019 按 specs/005-notes-batch-actions/quickstart.md 的全部 6 个场景手动走查一遍，确认与 spec.md 的验收标准（User Story 1/2/3 的 Acceptance Scenarios）及 Success Criteria 一致
  - 说明：本次实现未执行真实浏览器交互走查（当前环境无浏览器自动化工具，且本机 7500 端口已有开发服务器在运行，为避免干扰未复用）。已用等价的自动化方式覆盖：组件测试（NotesConsole.test.tsx）验证了场景 1/2（目录无复选框、表头全选/取消全选、按钮禁用态）；API 集成测试（route.test.ts，基于真实 SQLite + drizzle migrations）验证了场景 3/4/6 对应的数据层行为（频道/发布状态批量更新、非本人笔记被跳过、approvalStatus 重算规则）；`pnpm build` 已验证新路由与页面可正常编译产出。场景 5（跨目录导航清空勾选）仅通过代码走查确认（NotesConsole 在 `items` 引用变化时重置 selectedIds，TreeRow 卸载时清理子级勾选），未做浏览器级验证。建议用户在本机现有开发服务器上按 quickstart.md 手动过一遍，尤其是视觉布局与交互手感。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**：无依赖，可立即开始，四个语言文件任务可并行
- **Foundational（Phase 2）**：依赖 Setup 完成；阻塞 US1（Phase 4）、US2（Phase 5），但不阻塞 US3（Phase 3）——两者可并行推进
- **User Story 3（Phase 3）**：依赖 Setup 完成；不依赖 Foundational（纯前端选择机制），是 US1、US2 的前置 UI 能力
- **User Story 1（Phase 4）**：依赖 Phase 2（批量端点）与 Phase 3（选择机制、NotesBatchToolbar 按钮壳）均完成
- **User Story 2（Phase 5）**：依赖 Phase 3 完成，并复用 Phase 4（T013）中已实现的响应处理逻辑（同文件顺序追加）
- **Polish（Phase 6）**：依赖 Phase 3、4、5 全部完成

### User Story Dependencies

- **User Story 3（P1）**：无其他用户故事依赖，是 US1/US2 的共同前置条件
- **User Story 1（P1）**：依赖 US3 提供的勾选状态与按钮壳；与 US2 相互独立（各自的弹窗提交逻辑互不影响对方数据路径）
- **User Story 2（P2）**：依赖 US3；实现上复用 US1 阶段搭建的批量端点与响应处理模式，但业务语义独立，可在 US1 完成后随时插入

### Within Each User Story

- US3：NotesTreeTable 类型/表头扩展（T007）→ TreeRow 复选框渲染（T008）→ NotesBatchToolbar 壳（T009，可并行）→ NotesConsole 容器（T010）→ page.tsx 接入（T011）
- US1：page.tsx 查询 channels（T012）→ 设置频道弹窗（T013）；端点边界处理（T014）可与 T013 并行
- US2：设置发布状态弹窗（T015，复用 T013 的响应处理）

### Parallel Opportunities

- Phase 1 的 T001–T004（四个语言文件）可全部并行
- Phase 2 完成后，Phase 3（US3）与 Phase 2 本身可视为并行赛道（US3 不依赖 Foundational）
- T009（NotesBatchToolbar 壳）可与 T007/T008（NotesTreeTable 改造）并行开发，最终在 T010 汇合
- T014（端点边界处理）可与 T013（设置频道弹窗）并行
- Phase 6 的 T016、T017（两类测试）可并行编写

---

## Parallel Example: Phase 1 + Phase 3 起步

```bash
# Setup 阶段四个语言文件可同时进行：
Task: "在 src/locales/en.json 中新增批量操作相关文案 key"
Task: "在 src/locales/zh.json 中新增对应简体中文文案"
Task: "在 src/locales/es.json 中新增对应西班牙语文案"
Task: "在 src/locales/fr.json 中新增对应法语文案"

# US3 阶段，NotesBatchToolbar 壳与 NotesTreeTable 改造可并行：
Task: "新增 src/components/NotesBatchToolbar.tsx 按钮壳（禁用态）"
Task: "扩展 src/components/NotesTreeTable.tsx 的表头复选框与类型定义"
```

---

## Implementation Strategy

### MVP 范围（不同于"仅 User Story 1"的通用建议）

本功能中 User Story 3（复选框/全选机制）是 User Story 1、2 的运行前提——没有可勾选的笔记，"设置频道"
按钮点了也无从谈起。因此实际可独立演示的最小闭环是 **Phase 1 → Phase 2 → Phase 3 → Phase 4**
（Setup + Foundational + US3 + US1），完成后即可演示"勾选笔记 → 批量设置频道"这一核心场景。

1. 完成 Phase 1：Setup
2. 完成 Phase 2：Foundational（批量 API 端点）
3. 完成 Phase 3：User Story 3（复选框与全选）
4. 完成 Phase 4：User Story 1（批量设置频道）
5. **停下来验证**：按 quickstart.md 场景 1、2、3、5、6 独立测试
6. 如需，继续 Phase 5（User Story 2：批量设置发布状态）与 Phase 6（Polish）

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. + User Story 3 → 复选框/全选可用（尚无批量提交效果）→ 内部演示
3. + User Story 1 → 批量设置频道可用（MVP）→ 部署/演示
4. + User Story 2 → 批量设置发布状态可用 → 部署/演示
5. + Polish → 测试与质量门禁补齐

---

## Notes

- `[P]` 任务 = 不同文件、无先决依赖
- `[Story]` 标签用于将任务追溯到具体用户故事
- US3 虽为"前置能力"而非典型的终端用户价值交付，但其自身具备独立可测的验收标准（quickstart 场景 1、2、5），故仍作为独立用户故事阶段呈现，而非并入 Foundational
- 每个任务完成后建议提交一次 commit
- 可在任意 Checkpoint 处暂停以独立验证对应用户故事
- 避免：模糊任务描述、同文件并行冲突、破坏用户故事独立可测性的跨故事强耦合
