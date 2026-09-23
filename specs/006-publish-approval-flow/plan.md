# Implementation Plan: 笔记与频道的保存/发布分离及审核流程简化

**Branch**: `006-publish-approval-flow` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-publish-approval-flow/spec.md`

## Summary

将 notes/channels 的"内容编辑"与"提交公开"两个动作彻底解耦：新增或编辑仅保存内容，永不触发审核；只有用户显式点击"发布"才可能产生待审核事件。审核状态字段从现有的二态 `approval_status`（`pending`/`approved`）+ 两个独立布尔字段（`channels.is_public`、`notes.is_published`）收敛为单一的四态 `approval_status`（`draft`/`pending`/`approved`/`rejected`），并在公开页面查询层面强制执行"笔记自身已审核 且 所属频道也已审核"的复合可见性规则。技术方案：扩展 Drizzle SQLite schema 与迁移脚本、新增笔记/频道"发布"API 路由（笔记发布需选择频道，频道发布仅二次确认）、重写批量操作端点为单一"批量发布"语义、修改四个公开页面的查询条件、在编辑页与控制台列表页新增状态标识组件。

## Technical Context

**Language/Version**: TypeScript（Next.js 16 App Router，React 19）

**Primary Dependencies**: Next.js 16、Drizzle ORM 0.45（sqlite dialect）、drizzle-kit（迁移生成）、Tailwind CSS v4

**Storage**: Cloudflare D1（SQLite）生产环境；`better-sqlite3` 本地开发；通过 `migrations/` 下的 Drizzle 迁移文件管理 schema 变更

**Testing**: Vitest + @testing-library/react + jsdom（沿用现有 `*.test.tsx` / `route.test.ts` 约定，参考 `src/components/NotesConsole.test.tsx`、`src/app/api/console/notes/batch/route.test.ts`）

**Target Platform**: Cloudflare Workers（OpenNext + Wrangler 部署），浏览器端 Next.js App Router 渲染

**Project Type**: web-service（单体 Next.js 全栈应用，页面路由与 API 路由同仓库，无独立 frontend/backend 拆分）

**Performance Goals**: 沿用现状，不引入新性能指标；本功能是状态机与查询条件调整，不改变现有查询的数据规模级别

**Constraints**:

- 必须保留既有 `!isDev`（`process.env.NODE_ENV === "development"`）开发环境旁路约定 —— 本地开发时公开页面跳过 `approval_status` 过滤，便于调试，属现状既有行为，不在本次调整范围（见 research.md Decision 4）
- 批量操作沿用现有 200 条笔记上限（`MAX_NOTE_IDS`）
- 数据库层面为破坏性变更（删除 `is_public`/`is_published` 列、扩展 `approval_status` 取值范围），需要一次性数据回填迁移，不能简单地全部重置为 `draft`（否则会导致存量已发布内容从公开页面瞬间消失）

**Scale/Scope**: 影响 2 张核心表（`notes`、`channels`）与 1 张关联表（`approval_events`）的读写路径；影响 4 个公开页面查询、2 个控制台编辑页面、1 个批量操作端点、1 个审核处理端点、约 6 个前端组件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. 语言规范**：本计划及后续 research.md / data-model.md / quickstart.md / tasks.md 均使用简体中文撰写，技术标识符保留英文 —— PASS。
- **II. 上下文优先**：已阅读根目录 `README.md`（含 Tech Stack、Project Structure、Database schema、Migrations 章节）与 `src/db/schema.ts`、现有公开页面查询（`src/app/[lang]/page.tsx`、`channels/page.tsx`、`channels/[id]/page.tsx`、`notes/[id]/page.tsx`）、批量操作端点（`src/app/api/console/notes/batch/route.ts`）、审核处理端点（`src/app/api/console/approvals/[eventId]/route.ts`）源码 —— PASS。README 中的 Database Schema 表格（`is_public`、`is_published` 列）在实现完成后会与代码不一致，已记录为后续需要更新的文档项（不在本计划中直接修改）。
- **III. 精准手术式修改**：Project Structure 中列出的改动范围均为直接服务于 spec.md 需求的文件；不涉及无关重构 —— PASS（将在 tasks/implement 阶段落实）。
- **IV. 简洁优先**：状态作废（FR-017）复用现有 `approval_events` 结构而非新增字段/表；发布确认弹窗跨笔记/频道/批量三处复用同一 UI 模式（见 research.md Decision 6）—— PASS。
- **V. 质量门控**：本计划已给出 Phase 0/1 产出物作为可验证检查点；implement 阶段需运行 `pnpm test`、`pnpm build`（TypeScript 类型检查随 Next.js build 一并执行）—— PASS。
- **VI. 需求诚实性与澄清优先（NON-NEGOTIABLE）**：spec.md 中的全部 `[NEEDS CLARIFICATION]` 已在 `/speckit-clarify` 阶段消除；本计划新增的技术性未知点（数据迁移映射规则、状态作废的存储表示）在下方 Phase 0 research.md 中给出明确决策与理由，不默默假设。该功能会改变现有数据模型（删除两个布尔列）与部分公开页面的可见性语义（新增复合过滤条件），均已在 spec.md 的 Clarifications 与 Assumptions 中获得用户明确确认，满足"经过明确授权"要求 —— PASS。

无违规项，Complexity Tracking 表留空。

**Phase 1 设计后复查**：research.md 的 6 项决策与 data-model.md 的实体/状态机/迁移设计已完成，均未引入新的抽象层、新表或新依赖，未发现与上述门控冲突的设计决策；`approvals-patch.md` 中指出的"拒绝分支未回写 approval_status"是对现状缺陷的修复而非范围蔓延，与 spec.md FR-015 的要求一致。Constitution Check 维持 PASS，无需新增 Complexity Tracking 条目。

## Project Structure

### Documentation (this feature)

```text
specs/006-publish-approval-flow/
├── plan.md              # 本文件（/speckit-plan 输出）
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
│   ├── notes-publish.md
│   ├── channels-publish.md
│   ├── notes-batch-publish.md
│   └── approvals-patch.md
└── tasks.md              # Phase 2 输出（/speckit-tasks 命令生成，本命令不生成）
```

### Source Code（仓库根目录，真实路径）

```text
migrations/
└── 0007_publish_approval_flow.sql        # 新增：approval_status 四态扩展 + 移除 is_public/is_published + 数据回填

src/db/
└── schema.ts                              # 修改：channels/notes 移除 is_public/is_published，approval_status 类型扩展为四态

src/app/api/console/
├── notes/
│   ├── [noteId]/
│   │   ├── route.ts                       # 修改（实现阶段新发现）：PATCH 分支此前允许绕过发布流程直接任意设置 channelId，收窄为仅允许清空
│   │   └── publish/route.ts               # 新增：POST 笔记发布（需 channelId）
│   └── batch/route.ts                     # 修改：收敛为"批量发布"语义（必须提供 channelId）
├── channels/
│   └── [channelId]/
│       └── publish/route.ts               # 新增：POST 频道发布（无需选频道，仅确认）
└── approvals/[eventId]/route.ts           # 修改：reject 分支写回 approval_status="rejected"

src/app/api/files/[noteId]/[filename]/
└── route.ts                               # 修改（实现阶段新发现）：GET 附件下载补齐与 FR-007 一致的复合可见性校验（所有者/管理员例外）；DELETE 分支的审核状态联动改为"编辑即回退草稿"

src/app/[lang]/
├── page.tsx                               # 修改：公开首页笔记查询补齐"频道也已审核"条件
├── channels/
│   ├── page.tsx                           # 修改：查询条件改用 approval_status="approved"
│   └── [id]/page.tsx                      # 修改：同上
├── notes/[id]/page.tsx                    # 修改：同上
└── console/
    ├── notes/
    │   ├── page.tsx                       # 修改：批量工具栏改为单一"批量发布"入口
    │   └── [noteId]/page.tsx              # 修改：移除表单内 channelId/isPublished 字段，新增发布按钮+状态标识（新增页面不显示发布按钮）
    └── channels/
        ├── page.tsx                       # 修改：列表页 ch.isPublic 徽标改为四态状态标识
        └── [channelId]/page.tsx           # 修改：新增发布按钮（含二次确认）+ 状态标识

src/components/
├── NoteEditorForm.tsx                     # 修改：移除频道选择与发布勾选框
├── NotePublishDialog.tsx                  # 新增：笔记发布弹窗（选择频道 + 确认）
├── ChannelPublishButton.tsx               # 新增：频道发布二次确认弹窗
├── NotesBatchToolbar.tsx                  # 修改：合并为单一"批量发布"入口，复用频道选择弹窗
├── NotesTreeTable.tsx                     # 修改：状态标识从 isPublished 布尔改为四态展示
└── ApprovalStatusBadge.tsx                # 新增：四态状态标识的共用展示组件（供 NotesTreeTable 与 console/channels/page.tsx 列表复用）
```

**Structure Decision**：沿用现有单体 Next.js App Router 结构（页面路由 + API 路由 + 组件同仓库，无 frontend/backend 拆分），所有改动均落在上述已存在的目录约定内；仅新增 2 个 API 路由文件（笔记/频道发布）、1 个数据库迁移文件、3 个新组件文件（发布弹窗、频道发布按钮、状态标识徽标），其余为对既有文件的修改。

## Complexity Tracking

无需填写——Constitution Check 未发现需要豁免的违规项。
