# Implementation Plan: 精简支持语言范围（移除德语/日语/葡萄牙语/繁体中文）

**Branch**: `003-reduce-supported-languages` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-reduce-supported-languages/spec.md`

## Summary

将站点受支持语言集合从现有 8 种缩减为 4 种（保留 `en`/`fr`/`es`/`zh`，移除 `de-DE`/`ja`/`pt-PT`/`zh-TW`）。核心改动是从
`src/lib/language.ts` 的语言常量与 `supportedLanguages` 列表中移除这 4 项——由于语言切换下拉框、`generateStaticParams`
静态路由生成、根路径自动语言检测均已是数据驱动实现，移除后会自动收敛；同时删除 4 个对应的 `src/locales/*.json` 文件、
`src/lib/i18n.ts` 中的导入与映射、`src/data/tools.ts`/`src/data/privacy.ts` 中对应语言字段、
`src/components/NotesTreeTable.tsx` 中的 `DATE_LOCALE` 映射条目，并同步更新引用了这些语言的自动化测试。已下线语言的旧
URL 依赖现有的 `isValidLang` 守卫自然返回标准 404（无需新增重定向逻辑）。

## Technical Context

**Language/Version**: TypeScript 5（strict），Next.js 16 App Router，React 19

**Primary Dependencies**: 无新增依赖；复用现有 `accept-language` 库（浏览器语言协商）与既有的 `t()`/`LangKey`/`supportedLanguages` 数据驱动模式

**Storage**: 不涉及。用户生成内容（`users`/`channels`/`notes` 等表）不含语言字段，本功能不改动数据库 schema，无需迁移

**Testing**: Vitest + `@testing-library/react`（现有 `vitest.config.ts`），更新 `src/lib/language.test.ts`、`src/lib/i18n.test.ts`、`src/components/ToolGrid.test.tsx` 中引用已移除语言的断言

**Target Platform**: Cloudflare Workers（OpenNext 部署）与本地 `next dev`，与现状一致，无平台差异

**Project Type**: 单体 Next.js 全栈应用，沿用现有 `src/lib`/`src/locales`/`src/data`/`src/components` 结构，不新增目录

**Performance Goals**: 无专门指标；静态生成页面数量随语言数从 8 降为 4 而减少（构建产物变小，属于正向影响，非目标）

**Constraints**: 移除操作 MUST NOT 影响保留 4 种语言的现有页面、文案与功能（FR-007）；已下线语言的旧 URL MUST 表现为标准 404，不做重定向（FR-005，已在 Clarify 阶段确认）

**Scale/Scope**: 纯前端/静态内容与配置变更；涉及文件：`src/lib/language.ts`、`src/lib/i18n.ts`、4 个 `src/locales/*.json`（删除）、`src/data/tools.ts`、`src/data/privacy.ts`、`src/components/NotesTreeTable.tsx`、3 个测试文件、`README.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

对照 [constitution.md](../../.specify/memory/constitution.md) 逐条检查：

- 第 I 条（语言规范）：本计划及后续 tasks.md 均以简体中文撰写 — **PASS**。
- 第 II 条（上下文优先）：已阅读 README.md 与 `src/lib/language.ts`/`src/lib/i18n.ts`/`src/data/*` 等相关源码 — **PASS**。
- 第 III/IV 条（精准手术式修改 / 简洁优先）：改动范围严格限定于移除 4 种语言涉及的文件，不做无关重构 — **PASS**。
- 第 VI 条（需求诚实性与澄清优先）：旧 URL 处理方式已在 `/speckit.clarify` 阶段与用户确认（404），未静默假设 — **PASS**。
- **技术栈与依赖约束（Section 2）**：⚠️ **FAIL** — 该章节明确写明"国际化：支持 `en`、`es`、`fr`、`de-DE`、`pt-PT`、`ja`、`zh`、`zh-TW` 共 8 种语言"，与本功能"缩减为 4 种语言"的目标**直接冲突**。

**门禁裁决**：该冲突已在 `/speckit.specify` 阶段的完成报告中向用户提示过（需要后续对 constitution 做 MINOR 版本修订）。由于用户已通过显式的 `/speckit.specify` 请求授权此次语言精简（满足第 VI 条"未经明确授权不得变更"的例外条件），本计划**带着已记录的宪法冲突继续执行**，而非阻塞；该冲突及其解决方式记录在下方 Complexity Tracking 中，作为本功能收尾的强制后续项。

**Re-check (Post-Phase 1)**：Phase 1 设计产出（research.md、data-model.md、quickstart.md）未引入新的架构复杂度或额外宪法冲突；唯一已知冲突（技术栈章节的语言列表）维持原样，待实现完成后通过独立的 `/speckit.constitution` 修订闭环。

## Project Structure

### Documentation (this feature)

```text
specs/003-reduce-supported-languages/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

（本功能不涉及对外接口/契约变更，故不生成 `contracts/` 目录。）

### Source Code (repository root)

```text
src/
├── lib/
│   ├── language.ts          # 改造：移除 langDe/langPt/langJa/langZhTW 常量与 LangKey 联合类型分支，
│   │                         #       supportedLanguages 数组仅保留 en/fr/es/zh 4 项
│   ├── language.test.ts     # 改造：移除对已下线语言常量/选项的断言
│   ├── i18n.ts               # 改造：移除 de-DE/ja/pt-PT/zh-TW 的导入与 locales 映射条目
│   └── i18n.test.ts          # 改造：移除以已下线语言作为测试输入的用例
├── locales/
│   ├── de-DE.json            # 删除
│   ├── ja.json                # 删除
│   ├── pt-PT.json            # 删除
│   └── zh-TW.json             # 删除
├── data/
│   ├── tools.ts               # 改造：每个工具条目移除 de-DE/ja/pt-PT/zh-TW 字段
│   └── privacy.ts             # 改造：移除 de-DE/ja/pt-PT/zh-TW 对应内容块
└── components/
    ├── NotesTreeTable.tsx      # 改造：DATE_LOCALE 映射移除已下线语言条目
    └── ToolGrid.test.tsx       # 改造：测试数据移除已下线语言字段

README.md                       # 改造：语言数量/列表说明从 8 种更新为 4 种
```

**Structure Decision**：不新增任何目录或模块，改动完全落在现有的 `src/lib`（语言核心配置与国际化查表）、`src/locales`（按语言拆分的翻译文件，直接删除 4 个）、`src/data`（工具与隐私政策的多语言内容）、`src/components`（一处日期本地化映射）以及对应测试文件中；`generateStaticParams`（`[lang]/layout.tsx`、`privacy/page.tsx`、`tools/[tool]/page.tsx`）与语言切换下拉框（`LanguageSelector.tsx`）均已是基于 `supportedLanguages` 的数据驱动实现，`src/lib/language.ts` 收缩后自动生效，无需单独修改。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution 技术栈章节仍写"支持 8 种语言"，与本功能目标（4 种）冲突 | 用户通过 `/speckit.specify` 显式授权本次语言精简，属于第 VI 条"经明确授权"的变更；宪法修订（`/speckit.constitution`）是独立的治理动作，不应与功能代码改动耦合在同一次提交/工作流中 | 若强制先修订宪法再实现，会将治理流程与功能实现强绑定，增加不必要的顺序依赖；更简单的做法是记录冲突、明确后续收尾项（见下方 Follow-up），实现完成后单独跑 `/speckit.constitution` 做 MINOR 版本修订（更新语言列表为 4 种） |

**Follow-up（不属于本功能 tasks.md 范围，但需在实现完成后执行）**：运行 `/speckit.constitution`，将"国际化"一行的语言列表从 8 种更新为 `en`、`es`、`fr`、`zh` 4 种，版本号按 MINOR 递增（不兼容原则移除除外，纯内容更新视为 MINOR）。
