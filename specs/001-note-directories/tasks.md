# Tasks: 笔记目录（文件夹）管理

**Input**: Design documents from `/specs/001-note-directories/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/notes-directory-api.md](./contracts/notes-directory-api.md), [quickstart.md](./quickstart.md)

**Tests**: spec.md 未明确要求测试先行，故本次不生成强制性契约/集成测试任务；Polish 阶段包含运行现有测试套件与手动 quickstart 验证。

**Organization**: 任务按 User Story 分组，每个 Story 均可独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 描述中包含精确文件路径

## Path Conventions

单体 Next.js App Router 项目（见 [plan.md](./plan.md) 的 Project Structure）：`src/db`、`src/app/[lang]/console/notes`、`src/app/api/console/notes`、`src/components`、`src/locales`、`migrations/`。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 确认依赖状态，无需新增安装

- [X] T001 确认 [package.json](../../package.json) 中 `bs58`、`drizzle-orm`、`react-icons` 已满足本特性需求，无需新增依赖安装

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 User Story 都依赖的数据模型、迁移与共享校验逻辑

**⚠️ CRITICAL**: 本阶段完成前不得开始任何 User Story 的实现

- [X] T002 [P] 在 `src/db/schema.ts` 的 `notes` 表定义中新增 `mimeType`（列名 `mime_type`，`NOT NULL` 默认 `text/markdown`）与 `parentId`（列名 `parent_id`，可空，自引用 `notes.id`，`onDelete: "cascade"`）字段
- [X] T003 在 `src/db/schema.ts` 的 `notesRelations` 中新增自引用关系（`parent: one(notes, ...)`、`children: many(notes)`），随后执行 `drizzle-kit generate` 生成 `migrations/0005_note_directories.sql`（人工核对并修正因历史迁移快照缺失导致的重复语句）并应用到本地 SQLite 验证迁移成功（依赖 T002）
- [X] T004 [P] 在 `src/locales/en.json`、`src/locales/zh.json`、`src/locales/zh-TW.json`、`src/locales/de-DE.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/ja.json`、`src/locales/pt-PT.json` 中新增目录相关文案 key（如 `newDirectory`、`directoryName`、`directoryDescription`、`directoryNameRequired`、`nameConflict`、`noContentInDirectory`）
- [X] T005 新增共享校验工具 `src/lib/notesTree.ts`：导出 `assertUniqueNameInParent(db, userId, parentId, title, excludeId?)`（同 `user_id`+`parent_id` 范围内标题唯一性校验，命中时抛出可被 API 捕获的冲突错误）与 `resolveOwnedDirectory(db, userId, parentId)`（校验 `parentId` 存在、属于当前用户且 `mime_type = "directory"`，否则抛出 404）（依赖 T002）

**Checkpoint**: 数据模型与共享校验就绪，可并行开始所有 User Story

---

## Phase 3: User Story 1 - 创建目录 (Priority: P1) 🎯 MVP

**Goal**: 用户可在笔记管理页面创建目录（含所在层级、名称必填、描述可选），且同层级下目录与笔记名称互斥唯一

**Independent Test**: 在 `/[lang]/console/notes` 点击"新建目录"，输入名称保存后列表出现该目录；重复名称或与已有笔记标题冲突时被拦截并提示

### Implementation for User Story 1

- [X] T006 [US1] 新增 `POST /api/console/notes/directories` 路由 `src/app/api/console/notes/directories/route.ts`：`requireConsoleAuth` 鉴权、校验 `title` 去空白后非空、调用 `resolveOwnedDirectory`/`assertUniqueNameInParent`（依赖 T005），写入 `mime_type = "directory"` 的新记录，按 [contracts/notes-directory-api.md](./contracts/notes-directory-api.md) 返回 201/400/404/409
- [X] T007 [P] [US1] 新增新建目录弹窗组件 `src/components/CreateDirectoryDialog.tsx`：名称（必填）与描述（可选）表单，提交时 `fetch POST /api/console/notes/directories`（携带当前 `parentId`），展示 400/409 错误提示
- [X] T008 [US1] 修改 `src/app/[lang]/console/notes/page.tsx`：读取 `searchParams.parentId`，查询条件改为按当前 `parentId`（为空表示根目录）与 `userId` 过滤；在"新建笔记"按钮左侧接入 `CreateDirectoryDialog`（依赖 T006, T007），创建成功后刷新当前层级列表
- [X] T009 [US1] 调整 `src/app/[lang]/console/notes/[noteId]/page.tsx` 的 `handleSave`：新建笔记时读取当前 `parentId`（来自查询参数）写入 `notes.parentId`，并在保存前调用 `assertUniqueNameInParent` 校验标题在同层级内唯一（依赖 T005）

**Checkpoint**: User Story 1 应可独立完成并测试（创建目录、重名拦截、按 `parentId` 过滤显示）

---

## Phase 4: User Story 2 - 以树形结构浏览目录与笔记 (Priority: P2)

**Goal**: 用户可通过三角图标原地展开/收起目录子级，或点击目录名称导航到子级列表页面（URL 携带 Base58 `parentId`）

**Independent Test**: 预先创建多级目录/笔记数据，验证点击三角图标可原地展开/收起，点击目录名称可导航到对应 `?parentId=` 页面

### Implementation for User Story 2

- [X] T010 [US2] 新增 `GET /api/console/notes/children` 路由 `src/app/api/console/notes/children/route.ts`：按可选 `parentId` 查询用户所属的直接子级，附带 `hasChildren`（`COUNT` 子查询）与 `updatedAt`，按 [contracts/notes-directory-api.md](./contracts/notes-directory-api.md) 返回
- [X] T011 [P] [US2] 新增树形表格客户端组件 `src/components/NotesTreeTable.tsx`：接收初始层级条目（含 `hasChildren`），点击三角图标时调用 `GET /api/console/notes/children` 原地展开/收起子级；点击目录名称使用 `next/link` 导航到 `?parentId=<id>`
- [X] T012 [US2] 在 `src/app/[lang]/console/notes/page.tsx` 中，为当前层级的每个目录条目预计算 `hasChildren`，并用 `NotesTreeTable` 替换原有静态 `<table>` 渲染（依赖 T008, T010, T011）
- [X] T013 [US2] 在 `NotesTreeTable` 中处理展开空目录场景：子级请求返回空数组时显示"暂无内容"提示（依赖 T011）

**Checkpoint**: User Story 1 与 2 均可独立工作（浏览功能建立在 US1 的数据与查询基础上）

---

## Phase 5: User Story 3 - 图标与缩进的视觉层级 (Priority: P3)

**Goal**: 目录与笔记条目通过图标区分类型，展开层级时三角图标、图标与名称整体缩进

**Independent Test**: 创建三级嵌套结构并全部展开，验证图标区分类型、缩进整体随层级深度递增

### Implementation for User Story 3

- [X] T014 [P] [US3] 在 `NotesTreeTable` 行渲染中引入 `react-icons`（如 `FaRegFolder`/`FaRegFileAlt`）按 `mimeType` 区分图标，图标尺寸与行内文字大小（`text-sm`）保持一致
- [X] T015 [US3] 调整 `NotesTreeTable` 缩进结构：将三角占位符、类型图标与名称包裹为同一个 flex 容器，按层级深度整体应用左侧缩进（而非仅缩进三角图标）（依赖 T011）

**Checkpoint**: 三个 User Story 均可独立工作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨 Story 的验证与收尾

- [X] T016 运行现有测试套件（`src/components/*.test.tsx`、`src/lib/*.test.ts`）在 schema 变更后仍全部通过（使用 `node ./node_modules/vitest/vitest.mjs run` 绕开 pnpm/corepack 网络问题，结果：5 个测试文件 22 个用例全部通过）
- [X] T017 [P] 按照 [quickstart.md](./quickstart.md) 的 4 个场景手动验证功能，并对照 5 条 Success Criteria 逐一确认（在本地开发服务器 + 浏览器自动化实际操作验证：创建目录、重名拦截 409、目录/笔记混合重名拦截、原地展开/收起、空目录提示、图标与缩进均验证通过，验证完成后已清理测试数据）
- [X] T018 运行 `next build`（含类型检查）确保 Next.js 构建通过，并修复了因 `notes` 表自引用字段导致的 `ReturnType<typeof sqliteTable>` 类型退化问题（改用 `AnySQLiteColumn`）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有 User Story
- **User Story 1 (Phase 3)**: 依赖 Foundational 完成
- **User Story 2 (Phase 4)**: 依赖 Foundational 完成；实现上依赖 US1 已提供的 `parentId` 查询与列表渲染（T008），但浏览交互本身可独立测试
- **User Story 3 (Phase 5)**: 依赖 Foundational 完成；实现上依赖 US2 提供的 `NotesTreeTable`（T011）
- **Polish (Phase 6)**: 依赖期望交付的 User Story 全部完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后即可开始，不依赖其他 Story
- **User Story 2 (P2)**: Foundational 完成后可开始；为保持真正可独立测试，其树形浏览逻辑（T010、T011、T013）不依赖 US1 具体实现细节，但整合进页面（T012）依赖 T008
- **User Story 3 (P3)**: 依赖 US2 的 `NotesTreeTable` 组件已存在（T011）才能添加图标与缩进

### Parallel Opportunities

- T002 与 T004 可并行（不同文件）
- T006 与 T007 可并行开发，最终在 T008 中集成
- T010 与 T011 可并行开发，最终在 T012 中集成
- T014 与 T015 可并行的部分：T014（引入图标）与 T015（调整缩进结构）涉及同一文件 `NotesTreeTable.tsx`，建议顺序执行避免冲突

---

## Parallel Example: User Story 1

```bash
# T006 与 T007 可并行开发（不同文件）：
Task: "新增 POST /api/console/notes/directories 路由 src/app/api/console/notes/directories/route.ts"
Task: "新增新建目录弹窗组件 src/components/CreateDirectoryDialog.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 - 阻塞所有 Story）
3. 完成 Phase 3: User Story 1
4. **停止并验证**：独立测试创建目录、重名拦截
5. 视情况部署/演示

### Incremental Delivery

1. Setup + Foundational 完成 → 基础就绪
2. 加入 User Story 1 → 独立测试 → 部署/演示（MVP！）
3. 加入 User Story 2 → 独立测试 → 部署/演示
4. 加入 User Story 3 → 独立测试 → 部署/演示
5. 每个 Story 在不破坏之前 Story 的前提下增加价值

---

## Notes

- `[P]` 任务 = 不同文件、无依赖
- `[Story]` 标签将任务映射到具体 User Story 以便追溯
- 每个 User Story 应可独立完成与测试
- 每完成一个任务或一组逻辑相关任务后建议提交
