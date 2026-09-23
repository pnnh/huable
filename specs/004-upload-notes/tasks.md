# Tasks: 批量上传 Markdown 笔记

**Input**: Design documents from `/specs/004-upload-notes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/notes-upload-api.md](./contracts/notes-upload-api.md), [quickstart.md](./quickstart.md)

**Tests**: spec.md 未明确要求测试先行，故本次不生成强制性契约/集成测试任务；Polish 阶段包含运行现有测试套件与手动 quickstart 验证。

**Organization**: 任务按 User Story 分组，每个 Story 均可独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 描述中包含精确文件路径

## Path Conventions

单体 Next.js App Router 项目（见 [plan.md](./plan.md) 的 Project Structure）：`src/app/[lang]/console/notes`、`src/app/api/console/notes`、`src/components`、`src/lib`、`src/locales`。本特性无数据库迁移与新增依赖。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 确认依赖状态，无需新增安装

- [X] T001 确认 [package.json](../../package.json) 无需新增依赖——并发上传池、文件选择与校验均基于浏览器原生 `File`/`FormData` API 与自实现逻辑（见 [research.md](./research.md) 第 2 节）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 User Story 都依赖的共享常量与文案

**⚠️ CRITICAL**: 本阶段完成前不得开始任何 User Story 的实现

- [X] T002 [P] 新增共享常量模块 `src/lib/noteUploadLimits.ts`：导出 `MAX_QUEUE_SIZE = 30`、`MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024`、`MAX_CONCURRENT_UPLOADS = 3`、`ALLOWED_EXTENSIONS = [".md", ".markdown"]`，供客户端组件与 API 路由共同导入（见 [research.md](./research.md) 第 6 节）
- [X] T003 [P] 在 `src/locales/en.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/zh.json` 中新增上传相关文案 key（如 `uploadNotes`、`uploadNotesTitle`、`selectFiles`、`startUpload`、`queueFileName`、`queueExtension`、`queueSize`、`queueModified`、`queueActions`、`statusPending`、`statusUploading`、`statusSuccess`、`statusFailed`、`removeFile`、`queueFull`、`fileTooLarge`、`invalidFileType`、`nameConflict`、`uploadFailedGeneric`）

**Checkpoint**: 共享常量与文案就绪，可开始 User Story 1

---

## Phase 3: User Story 1 - 批量选择并上传 Markdown 文件创建笔记 (Priority: P1) 🎯 MVP

**Goal**: 用户从 `/{lang}/console/notes` 点击"Upload Notes"进入上传页面，多选合规 Markdown 文件后点击"开始上传"，系统以最多 3 并发批量创建笔记，队列中每个文件的状态标签独立更新为"成功"或"失败"

**Independent Test**: 参见 [quickstart.md](./quickstart.md) 场景一、场景二——根目录与子目录下分别选择若干 `.md` 文件上传，验证队列展示、并发上传、笔记创建结果与父级目录归属均符合预期

### Implementation for User Story 1

- [X] T004 [P] [US1] 新增 `POST /api/console/notes/upload` 路由 `src/app/api/console/notes/upload/route.ts`：`requireConsoleAuth` 鉴权 → 校验 `file` 存在且文件名以 `.md`/`.markdown` 结尾（否则 400）→ 校验 `file.size` 不超过 `MAX_FILE_SIZE_BYTES`（否则 413）→ 调用 `resolveOwnedDirectory`（否则 404）→ 以文件名去除扩展名作为 `title` 调用 `assertUniqueNameInParent`（否则 409）→ 写入 `mimeType: "text/markdown"`、`channelId: null`、`isPublished: false`、`approvalStatus: "approved"` 的新 `notes` 记录，按 [contracts/notes-upload-api.md](./contracts/notes-upload-api.md) 返回 201/400/401/404/409/413（依赖 T002）
- [X] T005 [P] [US1] 新增客户端组件 `src/components/NoteUploadQueue.tsx`：
  - 顶部文件选择按钮（`<input type="file" multiple accept=".md,.markdown">`），选择确认后按 `MAX_QUEUE_SIZE`/`MAX_FILE_SIZE_BYTES` 做客户端预校验，超限文件不计入队列并提示
  - 队列状态使用 `File` 对象元数据（`name`/`size`/`lastModified`）构造 `UploadQueueItem[]`（参见 [data-model.md](./data-model.md)），初始 `status: "pending"`
  - 队列列表渲染文件名称、后缀名、文件大小、最后修改时间、操作列（本任务先渲染状态标签，移除操作见 US2）
  - "开始上传"按钮：以最多 `MAX_CONCURRENT_UPLOADS` 并发调用 `POST /api/console/notes/upload`（`multipart/form-data`，字段 `file` + `parentId`），每个文件独立地将其 `status` 从 `pending` → `uploading` → `success`/`failed`，并在失败时记录 `errorMessage`（不影响队列中其他文件的状态）
  （依赖 T002、T003）
- [X] T006 [US1] 新增上传页面 `src/app/[lang]/console/notes/upload/page.tsx`：Server Component，校验 `lang`，读取 `searchParams.parentId`（缺省为 `null`），渲染 `SiteHeader`/`SiteFooter` 与 `NoteUploadQueue`（传入 `parentId`），提供返回列表页链接（`parentId` 存在时带 `?parentId=`）（依赖 T004、T005）
- [X] T007 [US1] 修改 `src/app/[lang]/console/notes/page.tsx`：在"New Note"链接左侧新增"Upload Notes"链接，`href` 为 `/{lang}/console/notes/upload`（当前 `parentId` 存在时追加 `?parentId=`），与现有 `newNoteHref` 的构造方式保持一致（依赖 T006）

**Checkpoint**: User Story 1 应可独立完成并测试（多选上传、并发处理、按目录归属创建笔记、成功/失败状态区分）

---

## Phase 4: User Story 2 - 上传前从队列中移除文件 (Priority: P2)

**Goal**: 用户可在点击"开始上传"之前，将队列中尚未处理的文件移除，已进入上传中或已完成的文件不可移除

**Independent Test**: 参见 [quickstart.md](./quickstart.md) 场景三——移除待上传文件不影响队列中其他文件；已成功/上传中的文件的移除操作不可用

### Implementation for User Story 2

- [X] T008 [US2] 扩展 `src/components/NoteUploadQueue.tsx` 操作列：为 `status === "pending"` 的行渲染"移除"按钮，点击后从队列状态数组中删除该条目；`status` 为 `uploading`/`success`/`failed` 的行不渲染或禁用该操作（依赖 T005）

**Checkpoint**: User Story 1 与 2 均可独立工作

---

## Phase 5: User Story 3 - 查看失败文件的简短错误原因 (Priority: P3)

**Goal**: 用户将鼠标悬停在"失败"状态标签上时，看到一条简短错误说明；移开鼠标后提示消失

**Independent Test**: 参见 [quickstart.md](./quickstart.md) 场景四——制造同名冲突/超大文件等失败场景，验证悬停显示对应错误文案且不遮挡列表其他内容

### Implementation for User Story 3

- [X] T009 [US3] 扩展 `src/components/NoteUploadQueue.tsx` 状态标签：为 `status === "failed"` 的状态标签添加悬停提示（如原生 `title` 属性或轻量 tooltip），内容取自该条目的 `errorMessage`（`T004`/`T005` 已在响应处理中捕获），映射 API 返回的 `invalid_file`/`parent_not_found`/`name_conflict`/`file_too_large`/网络错误等情形为对应的简短本地化文案（依赖 T003、T005）

**Checkpoint**: 三个 User Story 均可独立工作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨 Story 的验证与收尾

- [X] T010 运行 `pnpm test` 确保现有测试套件（含新增组件相关测试，如有）全部通过
- [X] T011 [P] 按照 [quickstart.md](./quickstart.md) 的 4 个场景（含契约级 curl 验证）手动验证功能，并对照 spec.md 的 5 条 Success Criteria 逐一确认
- [X] T012 运行 `pnpm build`（含类型检查）确保 Next.js 构建通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有 User Story
- **User Story 1 (Phase 3)**: 依赖 Foundational 完成
- **User Story 2 (Phase 4)**: 依赖 Foundational 完成；实现上依赖 US1 已创建的 `NoteUploadQueue.tsx`（T005）
- **User Story 3 (Phase 5)**: 依赖 Foundational 完成；实现上依赖 US1 已创建的 `NoteUploadQueue.tsx`（T005）及其对 `errorMessage` 的捕获
- **Polish (Phase 6)**: 依赖期望交付的 User Story 全部完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后即可开始，不依赖其他 Story
- **User Story 2 (P2)**: Foundational 完成后可开始；为保持独立可测试，移除逻辑本身不依赖 US1 的上传/并发实现细节，但需先有 T005 建立的组件与队列状态结构才能追加操作列
- **User Story 3 (P3)**: 同上，需先有 T005 建立的组件与 T004 返回的错误信息结构，但悬停提示本身是纯 UI 增量，不影响 US1/US2 已实现的行为

### Parallel Opportunities

- T002 与 T003 可并行（不同文件）
- T004（API 路由）与 T005（客户端组件）可并行开发——两者仅通过 [contracts/notes-upload-api.md](./contracts/notes-upload-api.md) 约定的请求/响应格式耦合，最终在 T006 中集成
- T008（US2）与 T009（US3）均修改 `NoteUploadQueue.tsx` 同一文件，建议顺序执行以避免冲突

---

## Parallel Example: User Story 1

```bash
# T004 与 T005 可并行开发（不同文件，按契约对接）：
Task: "新增 POST /api/console/notes/upload 路由 src/app/api/console/notes/upload/route.ts"
Task: "新增客户端组件 src/components/NoteUploadQueue.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 - 阻塞所有 Story）
3. 完成 Phase 3: User Story 1
4. **停止并验证**：按 quickstart 场景一、二独立测试批量上传与目录归属
5. 视情况部署/演示

### Incremental Delivery

1. Setup + Foundational 完成 → 基础就绪
2. 加入 User Story 1 → 独立测试 → 部署/演示（MVP！）
3. 加入 User Story 2 → 独立测试 → 部署/演示
4. 加入 User Story 3 → 独立测试 → 部署/演示
5. 每个 Story 在不破坏之前 Story 的前提下增加价值

### Parallel Team Strategy

多开发者场景：

1. 团队共同完成 Setup + Foundational
2. Foundational 完成后：
   - 开发者 A：User Story 1（T004 API 路由 + T005 组件基础，可与自己并行拆分）
   - 开发者 B：等待 T005 落地后接手 User Story 2（T008）
   - 开发者 C：等待 T005/T004 落地后接手 User Story 3（T009）
3. US2、US3 因共享同一组件文件，建议在 US1 的 T005 合并后再开始，避免同文件冲突

---

## Notes

- `[P]` 任务 = 不同文件、无依赖
- `[Story]` 标签将任务映射到具体 User Story 以便追溯
- 每个 User Story 应可独立完成与测试
- 每完成一个任务或一组逻辑相关任务后建议提交
- T008、T009 均修改 `NoteUploadQueue.tsx`，避免与 T005 并行执行，需等其合并后再开始
