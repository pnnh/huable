# Implementation Plan: 笔记批量设置频道与发布状态

**Branch**: `005-notes-batch-actions` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-notes-batch-actions/spec.md`

## Summary

在 `/[lang]/console/notes` 笔记列表页工具栏新增"设置频道""设置发布状态"两个按钮，并在列表每一行左侧和表头新增复选框，支持仅对笔记（不含目录）进行多选，批量将所选笔记的频道或发布状态更新为同一目标值。技术方案：新增一个客户端选择状态容器组件承接原有服务端渲染的 `NotesTreeTable`，为其注入勾选能力；新增一个统一的批量更新 API 端点，复用现有单笔记编辑页的"频道+已发布 ⇒ 待审批"规则逐条重算 `approvalStatus`，仅更新当前用户拥有且类型为笔记的记录。

## Technical Context

**Language/Version**: TypeScript（Next.js 16.2.4 App Router，React 19.2.4）

**Primary Dependencies**: Next.js（Server Components + Client Components）、Drizzle ORM、react-icons（复用现有 `NotesTreeTable` 图标）

**Storage**: SQLite（本地开发，`better-sqlite3`）/ Cloudflare D1（生产），统一通过 `src/db/index.ts` 的 Drizzle 实例访问 `notes`、`channels` 表

**Testing**: Vitest + `@testing-library/react`（沿用 `src/components/*.test.tsx` 现有模式）

**Target Platform**: Cloudflare Workers（OpenNext + Wrangler 部署），浏览器端 SSR + 客户端交互

**Project Type**: Web 应用（单一 Next.js 项目，无独立前后端拆分）

**Performance Goals**: 单次批量请求（≤200 条笔记）在正常网络条件下 2 秒内返回，满足 spec SC-001（10 篇笔记 30 秒内完成整个交互流程）

**Constraints**: 必须复用现有鉴权（`requireConsoleAuth` + `getCurrentUser`）与审批规则（频道非空且已发布 ⇒ `approvalStatus = "pending"`，否则 `"approved"`）；不得引入新的后端技术栈或状态管理库；不得改变现有单笔记编辑 API（`PATCH /api/console/notes/[noteId]`）的既有语义

**Scale/Scope**: 单用户会话内的笔记列表（当前层级 + 已展开子目录，数十至数百条量级）；批量请求笔记数量上限 200（防御性限制，避免超大请求）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 评估 | 结论 |
|------|------|------|
| I. 语言规范 | spec.md / plan.md 均使用简体中文撰写，技术标识符保留英文 | PASS |
| II. 上下文优先 | 已阅读 `page.tsx`、`NotesTreeTable.tsx`、`schema.ts`、`[noteId]/page.tsx`、现有 API 路由（`[noteId]`、`children`、`directories`）、`notesTree.ts` 等相关源码，未发现文档与代码冲突 | PASS |
| III. 精准手术式修改 | 方案仅新增批量相关组件/端点，对 `page.tsx`、`NotesTreeTable.tsx` 的改动限定为注入选择状态与复选框，不重构无关逻辑 | PASS |
| IV. 简洁优先 | 采用单一统一批量端点（而非按字段拆分多个端点），复用既有 PATCH 局部更新与 Dialog 组件模式，未引入新抽象层 | PASS |
| V. 质量门控 | 本计划提供 quickstart.md 作为可验证检查点；`/speckit-tasks` 阶段将包含 lint/typecheck/test 任务 | PASS |
| VI. 需求诚实性与澄清优先 | spec.md 的 Assumptions 均直接追溯自现有代码行为（单笔记编辑页的频道/发布/审批规则、目录无频道属性），未涉及安全、隐私、资金、数据删除或权限提升类无默认值决策；未残留 `[NEEDS CLARIFICATION]` 标记 | PASS（假设为既有行为的忠实复用，非新造业务决策，风险可控） |

无违反项，`Complexity Tracking` 表无需填写。

## Project Structure

### Documentation (this feature)

```text
specs/005-notes-batch-actions/
├── plan.md              # 本文件（/speckit-plan 输出）
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/
│   └── batch-update.md  # Phase 1 输出：批量更新端点契约
└── tasks.md              # Phase 2 输出（由 /speckit-tasks 生成，本命令不生成）
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [lang]/console/notes/
│   │   └── page.tsx                       # [修改] 查询 channels 列表并传给新的客户端容器组件
│   └── api/console/notes/
│       ├── batch/
│       │   └── route.ts                   # [新增] POST：批量更新 channelId / isPublished
│       ├── [noteId]/route.ts               # 不变，仅作为既有单条更新的参照实现
│       ├── children/route.ts               # 不变
│       └── _auth.ts                        # 复用，位于 src/app/api/console/_auth.ts
├── components/
│   ├── NotesConsole.tsx                    # [新增] 客户端容器：持有勾选状态，编排工具栏批量按钮 + NotesTreeTable
│   ├── NotesBatchToolbar.tsx               # [新增] "设置频道" / "设置发布状态" 按钮 + 两个弹窗
│   ├── NotesTreeTable.tsx                  # [修改] 接受 selectedIds / onToggleRow / onToggleAll，渲染复选框列（目录行不渲染）
│   └── CreateDirectoryDialog.tsx           # 不变，作为弹窗交互模式参照
└── lib/
    └── notesTree.ts                        # 不变，批量端点复用其所有权校验思路（按 id 列表查询替代单条查询）

src/locales/{en,es,fr,zh}.json               # [修改] 新增按钮/弹窗文案 key（setChannel、setPublishStatus 等）

src/components/
└── NotesConsole.test.tsx                    # [新增] 覆盖复选框可见性、全选、按钮禁用态等行为
src/app/api/console/notes/batch/
└── route.test.ts                             # [新增，如现有 API 路由测试模式存在则遵循；否则以组件+契约测试为主]
```

**Structure Decision**: 沿用现有单一 Next.js 项目结构（无 frontend/backend 拆分）。批量交互逻辑放在新增的客户端容器组件 `NotesConsole`（因为 `page.tsx` 是服务端组件，无法直接持有勾选状态），批量数据变更放在新增的统一 API 端点 `POST /api/console/notes/batch`，与现有 `PATCH /api/console/notes/[noteId]`、`POST /api/console/notes/directories` 保持同构的鉴权与错误响应风格。

## Complexity Tracking

*无违反项，本节留空。*
