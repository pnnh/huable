# Implementation Plan: 笔记目录（文件夹）管理

**Branch**: `001-note-directories` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-note-directories/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

在现有 `notes` 表新增 `mime_type`（区分笔记 `text/markdown` 与目录 `directory`）与 `parent_id`（表达层级归属）字段，并对历史数据做默认值迁移。在 `/[lang]/console/notes` 笔记管理页面新增"新建目录"入口（弹窗输入名称/描述，同层级内目录与笔记名称唯一），并将该页面本身改造为树形表格：可原地展开/收起子级，也可点击目录名称通过 `parentId`（Base58 编码，风格与现有笔记 ID 一致）导航到子级列表；目录与笔记条目左侧显示对应类型图标，展开层级时箭头+图标+名称整体缩进。

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 (App Router, React 19 Server Components + Server Actions)

**Primary Dependencies**: Drizzle ORM 0.45（`drizzle-orm/better-sqlite3` 与 `drizzle-orm/d1`）、`bs58`（Base58 ID 编解码，复用 `src/db/schema.ts` 中的 `createId`/`encodeUuidToBase58`）、`react-icons`（目录/笔记类型图标）、`uuidv7`

**Storage**: 开发环境使用本地 `better-sqlite3` 文件（`.data/huable.db`），生产环境使用 Cloudflare D1；两者共用 `src/db/schema.ts` 定义的同一套 Drizzle schema 与 `migrations/` 下的 SQL 迁移文件，由 `getDb()`（[src/db/index.ts](../../src/db/index.ts)）按运行环境切换数据源

**Testing**: Vitest + `@testing-library/react`（`jsdom` 环境），测试文件与源码同目录（如 `ToolGrid.test.tsx`），执行命令 `pnpm test`

**Target Platform**: Cloudflare Workers（通过 `@opennextjs/cloudflare` 部署 Next.js），本地开发通过 `next dev`

**Project Type**: 单体 Web 应用（Next.js App Router，页面 + 内部 API Route，无独立前后端分仓）

**Performance Goals**: 无特殊指标；树形展开为轻量客户端交互，子级数据量在单用户场景下（数十~数百条）无需分页优化

**Constraints**: 必须保证开发环境（本地 SQLite）与生产环境（Cloudflare D1）行为一致，通过统一 Drizzle schema + 迁移文件实现，不引入环境特定分支逻辑；沿用现有基于 `userId` 的数据隔离与 `requireConsoleAuth`（[src/app/api/console/_auth.ts](../../src/app/api/console/_auth.ts)）鉴权模式

**Scale/Scope**: 单用户笔记/目录规模（数十~数百条），无需支持深层并发写入或大规模树的虚拟滚动

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 当前仍为未填充的占位符模板（`[PRINCIPLE_1_NAME]` 等占位符未被替换），项目尚未定义具体的强制性原则。因此本 Gate 无具体条款可供校验，视为**通过**（无可判定的违规项），后续 Phase 1 设计完成后无需重新评估该 Gate。

## Project Structure

### Documentation (this feature)

```text
specs/001-note-directories/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── notes-directory-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── db/
│   └── schema.ts                              # notes 表新增 mime_type、parent_id 字段
├── app/
│   ├── [lang]/console/notes/
│   │   ├── page.tsx                            # 改造为树形表格：根级/parentId 子级查询、展开、新建目录入口
│   │   └── [noteId]/page.tsx                   # 沿用现有笔记创建/编辑流程，携带当前 parentId 上下文
│   └── api/console/notes/
│       ├── directories/route.ts                # 新增：POST 创建目录
│       └── children/route.ts                   # 新增：GET 懒加载目录子级
├── components/
│   ├── CreateDirectoryDialog.tsx               # 新增：新建目录弹窗（名称必填、描述可选）
│   └── NotesTreeTable.tsx                      # 新增：树形表格客户端组件（展开/收起、图标、缩进）
└── locales/*.json                              # 新增目录相关文案 key（如 newDirectory、directoryName 等）

migrations/
└── 0005_note_directories.sql                   # 新增：mime_type、parent_id 列迁移
```

**Structure Decision**: 沿用现有单体 Next.js App Router 项目结构（无需拆分 frontend/backend）。新增能力落在既有的 `src/db`（schema 扩展）、`src/app/[lang]/console/notes`（页面树形化改造）、`src/app/api/console/notes`（新增两个内部 API 端点）与 `src/components`（新增弹窗与树形表格客户端组件）目录中，并新增一个 `migrations/` SQL 迁移文件，与现有笔记/频道/审批等功能的组织方式保持一致。

## Complexity Tracking

*本特性未引入违反 Constitution Check 的复杂度（该 Gate 因项目宪法尚未填充具体原则而无判定项），无需填写此表。*
