# Implementation Plan: 批量上传 Markdown 笔记

**Branch**: `004-upload-notes` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-upload-notes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

在 `/[lang]/console/notes` 列表页的"New Note"按钮左侧新增"Upload Notes"入口，携带当前 `parentId` 跳转到新的 `/[lang]/console/notes/upload` 页面。该页面提供多选 Markdown 文件的选择入口，选中后在页面下方以客户端状态维护一个上传队列（文件名/后缀/大小/修改时间/状态/移除操作），点击"开始上传"后以最多 3 个并发的方式逐个调用新增的 `POST /api/console/notes/upload` 端点，每个文件独立创建一篇笔记（`mimeType: "text/markdown"`，标题取自文件名，正文取自文件内容，归属于跳转前所在的目录），并将该文件在队列中的状态更新为成功或失败（失败时鼠标悬停展示简短错误）。队列数量上限（30）、单文件大小上限（2MB）、并发上限（3）均以共享常量模块硬编码，客户端与服务端各自使用同一份常量做校验。不涉及数据库 schema 变更，复用现有的 `notes` 表结构与 `assertUniqueNameInParent` / `resolveOwnedDirectory` 校验逻辑。

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16（App Router，React 19 Server Components + Client Components）

**Primary Dependencies**: Drizzle ORM 0.45（`drizzle-orm/better-sqlite3` 与 `drizzle-orm/d1`，经 `getDb()` 按环境切换）；不引入新的第三方依赖——并发上传池、文件选择与校验均基于浏览器原生 `File`/`FormData` API 与少量自实现逻辑

**Storage**: 开发环境 `better-sqlite3`（`.data/huable.db`），生产环境 Cloudflare D1，共用 `src/db/schema.ts` 中已存在的 `notes` 表（无需新增列或迁移文件）；上传的 Markdown 文本直接写入 `notes.body`，不经过 `src/lib/storage.ts` 的文件对象存储（该存储仅服务于笔记附件，不适用于笔记正文本身）

**Testing**: Vitest + `@testing-library/react`（`jsdom` 环境），测试文件与源码同目录，执行命令 `pnpm test`

**Target Platform**: Cloudflare Workers（通过 `@opennextjs/cloudflare` 部署），本地开发通过 `next dev`

**Project Type**: 单体 Web 应用（Next.js App Router，页面 + 内部 API Route，无独立前后端分仓）

**Performance Goals**: 无特殊指标；单用户场景下最多 30 个文件、3 并发的上传规模远低于需要专门性能优化的量级

**Constraints**: 必须复用现有 `requireConsoleAuth`（[src/app/api/console/_auth.ts](../../src/app/api/console/_auth.ts)）鉴权与按 `userId` 隔离的数据访问模式；必须复用 `assertUniqueNameInParent` / `resolveOwnedDirectory`（[src/lib/notesTree.ts](../../src/lib/notesTree.ts)）保持同级命名唯一性约束与已有目录创建流程一致；数量/大小/并发三个硬编码常量须在客户端与服务端共用同一来源，避免重复定义导致校验不一致

**Scale/Scope**: 单次最多 30 个文件、单文件不超过 2MB、最多 3 个并发上传请求；单用户操作，无需考虑多用户并发写入同一目录的竞态优化

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

对照 `.specify/memory/constitution.md` v1.1.0 逐条核对：

- **I. 语言规范**：本计划及后续 research/data-model/quickstart/contracts 均使用简体中文撰写，技术标识符保留英文。**通过**。
- **II. 上下文优先**：已阅读根 `README.md`、`AGENTS.md`、既有 `001-note-directories` 的 spec/plan/contracts 作为同类功能参考，并直接阅读了 `src/app/[lang]/console/notes/page.tsx`、`[noteId]/page.tsx`、`src/lib/notesTree.ts`、`src/app/api/console/notes/*`、`src/app/api/console/upload/route.ts`、`src/components/CreateDirectoryDialog.tsx` 等相关源码以确认现有模式。**通过**。
- **III. 精准手术式修改**：设计仅新增 upload 页面、一个客户端组件、一个 API 路由、一个共享常量模块，以及在列表页新增一个按钮链接；不改动无关的笔记编辑、频道、审批逻辑。**通过**。
- **IV. 简洁优先**：不引入并发控制第三方库（如 `p-limit`），改用最小自实现的并发池；不新增数据库字段/迁移，复用现有 `notes` 表与校验函数。**通过**。
- **V. 质量门控**：本计划本身即为多步骤任务的检查点划分（Phase 0/1，后续 `/speckit.tasks` 拆分可执行任务）；实现阶段将运行 `pnpm test` 与 `pnpm lint`（如项目已配置）验证。**通过**。
- **VI. 需求诚实性与澄清优先**：spec.md 中所有默认值均已在 Assumptions 节列出且未静默扩展权限/数据删除/支付类行为；本计划未引入 spec 之外的新需求。**通过**。

无违反项，**Gate 通过**，无需填写 Complexity Tracking。Phase 1 设计完成后将重新核对（见下）。

**Phase 1 设计后复查**：`research.md`、`data-model.md`、`contracts/notes-upload-api.md`、`quickstart.md` 完成后重新对照六条原则——设计未新增数据库表/字段、未引入新依赖、完全复用 `assertUniqueNameInParent`/`resolveOwnedDirectory`/`requireConsoleAuth`，且所有默认值均可追溯到 spec.md 的 Assumptions 或既有代码模式，无新增的静默假设。**Gate 复查通过**。

## Project Structure

### Documentation (this feature)

```text
specs/004-upload-notes/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── notes-upload-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [lang]/console/notes/
│   │   ├── page.tsx                            # 在 "New Note" 左侧新增 "Upload Notes" 链接（携带当前 parentId）
│   │   └── upload/
│   │       └── page.tsx                        # 新增：上传页面（读取 parentId，渲染 NoteUploadQueue 客户端组件）
│   └── api/console/notes/
│       └── upload/
│           └── route.ts                        # 新增：POST 单文件上传创建笔记，服务端重新校验大小/后缀/父目录/同名冲突
├── components/
│   └── NoteUploadQueue.tsx                      # 新增：文件选择、队列展示（名称/后缀/大小/修改时间/状态/移除）、
│                                                 #        开始上传按钮、最多 3 并发的上传调度、失败悬停提示
├── lib/
│   └── noteUploadLimits.ts                      # 新增：共享常量（MAX_QUEUE_SIZE=30、MAX_FILE_SIZE_BYTES=2MB、
│                                                 #        MAX_CONCURRENT_UPLOADS=3、ALLOWED_EXTENSIONS），客户端与
│                                                 #        API 路由共同导入，避免重复定义
└── locales/*.json                                # 新增文案 key（uploadNotes、上传页标题、队列列头、三态状态标签、
                                                   #  各类失败提示文案等）
```

**Structure Decision**: 沿用现有单体 Next.js App Router 结构，不拆分 frontend/backend，也不新增数据库迁移。新增能力集中在 `src/app/[lang]/console/notes/upload`（新页面）、`src/app/api/console/notes/upload`（新 API 路由）、`src/components/NoteUploadQueue.tsx`（新客户端组件）与 `src/lib/noteUploadLimits.ts`（新共享常量模块），与既有 `001-note-directories` 特性中"页面 + 内部 API + 客户端组件"的组织方式保持一致；仅在 `src/app/[lang]/console/notes/page.tsx` 做一处最小改动（新增入口链接）。

## Complexity Tracking

*本特性未引入违反 Constitution Check 的复杂度，无需填写此表。*
