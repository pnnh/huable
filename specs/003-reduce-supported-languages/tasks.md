---

description: "Task list template for feature implementation"
---

# Tasks: 精简支持语言范围（移除德语/日语/葡萄牙语/繁体中文）

**Input**: Design documents from `/specs/003-reduce-supported-languages/`

**Prerequisites**: [plan.md](./plan.md)（必需）、[spec.md](./spec.md)（必需，用户故事）、[research.md](./research.md)、[data-model.md](./data-model.md)、[quickstart.md](./quickstart.md)

**Tests**: spec.md 未明确要求 TDD/自动化测试，本任务列表不包含新增自动化测试任务；仅包含对现有测试文件的同步更新（因引用了已移除语言而需要修改），以及各用户故事对应的 quickstart.md 手动验证任务。

**Organization**: 任务按用户故事分组，以便每个故事可以被独立验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖）
- **[Story]**: 该任务所属的用户故事（US1/US2/US3）
- 描述中包含确切文件路径

## Path Conventions

单体 Next.js 仓库，路径均基于仓库根目录 `src/`（见 [plan.md](./plan.md) 的 Project Structure）。

---

## Phase 1: Setup

**Purpose**: 记录基线状态，作为本功能改动前后的对比基准

- [X] T001 运行 `pnpm test` 确认基线测试全部通过（改动前基准，对应 [quickstart.md](./quickstart.md) 前置条件）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 收缩受支持语言集合的核心配置——由于语言切换下拉框、`generateStaticParams`、根路径自动语言检测均已是基于
`supportedLanguages`/`LangKey` 的数据驱动实现（见 [research.md](./research.md) 决策 1-3），本阶段完成后三个用户故事的
行为会自动生效，无需在各页面单独编码

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事的验证

- [X] T002 更新 [src/lib/language.ts](../../src/lib/language.ts)：移除 `langDe`/`langPt`/`langJa`/`langZhTW` 常量、`LangKey` 联合类型中对应的 4 个分支、`supportedLanguages` 数组中对应的 4 项，仅保留 `en`/`es`/`fr`/`zh`（FR-001）
- [X] T003 [P] 更新 [src/lib/i18n.ts](../../src/lib/i18n.ts)：移除 `de-DE`/`ja`/`pt-PT`/`zh-TW` 对应的 4 个 `import` 语句与 `locales` 映射条目（依赖 T002 收缩后的 `LangKey`，否则 `Record<LangKey, LocaleMessages>` 类型不匹配）
- [X] T004 [P] 删除 [src/locales/de-DE.json](../../src/locales/de-DE.json)、[ja.json](../../src/locales/ja.json)、[pt-PT.json](../../src/locales/pt-PT.json)、[zh-TW.json](../../src/locales/zh-TW.json) 4 个文件（FR-002）
- [X] T005 [P] 更新 [src/components/NotesTreeTable.tsx](../../src/components/NotesTreeTable.tsx)：`DATE_LOCALE` 映射中移除 `de-DE`/`pt-PT`/`ja`/`zh-TW` 4 个条目
- [X] T006 [P] 更新 [src/data/tools.ts](../../src/data/tools.ts)：每个工具条目的 `name`/`description`/`features`/`detail` 字段中移除 `de-DE`/`pt-PT`/`ja`/`zh-TW` 4 个已下线语言的键（FR-002；`LangMap`/`LangMapArray` 基于 `LangKey` 定义，收缩后编译期会强制要求移除多余键）
- [X] T007 [P] 更新 [src/data/privacy.ts](../../src/data/privacy.ts)：`privacyContent` 中移除 `de-DE`/`pt-PT`/`ja`/`zh-TW` 4 个对应的内容块（FR-002；`Record<LangKey, PrivacyContent>` 收缩后编译期同样会强制要求移除）

**Checkpoint**：受支持语言集合已收缩为 4 种，下拉框、路由生成、旧 URL 404、浏览器自动检测应已自动生效，可以开始各用户故事的验证

---

## Phase 3: User Story 1 - 语言切换入口只展示保留的 4 种语言 (Priority: P1) 🎯 MVP

**Goal**: 站内任意页面的语言切换下拉框只展示英语、法语、西班牙语、简体中文 4 个选项

**Independent Test**: 打开首页/工具详情页/隐私政策页，展开语言切换下拉框，确认只有 4 个选项且切换后文案正确

### Implementation for User Story 1

- [X] T008 [US1] 按 [quickstart.md](./quickstart.md) 场景一手动验证：首页、工具详情页（如 `/en/tools/basex`）、隐私政策页（`/en/privacy`）的语言切换下拉框均只展示 4 个选项，切换到 `fr`/`es`/`zh` 后文案正确且无已下线语言文案残留（SC-001）

**Checkpoint**：User Story 1 应可独立验证通过

---

## Phase 4: User Story 2 - 访问已下线语言的旧链接得到标准 404 (Priority: P2)

**Goal**: 访问 `/de-DE/`、`/ja/...`、`/pt-PT/...`、`/zh-TW/...` 等旧 URL 均返回标准 404

**Independent Test**: 直接访问上述 URL，确认返回 404，且与访问任意从未支持过的语言前缀（如 `/xx/`）表现一致

### Implementation for User Story 2

- [X] T009 [US2] 按 [quickstart.md](./quickstart.md) 场景二手动验证（`curl -o /dev/null -w "%{http_code}"`）：`/de-DE/`、`/ja/tools/basex`、`/pt-PT/privacy`、`/zh-TW/channels` 与对照组 `/xx/` 均返回 `404`（SC-002）

**Checkpoint**：User Story 1 与 User Story 2 应均可独立验证通过

---

## Phase 5: User Story 3 - 浏览器自动语言检测优雅降级 (Priority: P3)

**Goal**: 浏览器首选语言为已下线的 4 种语言之一时，访问根路径被自动导向英语版本

**Independent Test**: 设置 `Accept-Language` 为 `de-DE`/`ja`/`pt-PT`/`zh-TW`，访问 `/`，确认重定向到 `/en/`

### Implementation for User Story 3

- [X] T010 [US3] 按 [quickstart.md](./quickstart.md) 场景三手动验证（`curl -H "Accept-Language: ..."`）：`de-DE`/`ja`/`pt-PT` 重定向到 `/en/`，`zh-TW` 因与 `zh` 共享语言家族重定向到 `/zh/`（SC-004，实测并与用户确认后写入 spec.md）

**Checkpoint**：全部三个用户故事应均可独立验证通过

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 同步更新引用了已下线语言的测试与文档，确认整体无回归

- [X] T011 [P] 更新 [src/lib/language.test.ts](../../src/lib/language.test.ts)：移除对 `langDe`/`langPt`/`langJa`/`langZhTW` 及相关下拉选项的断言，仅覆盖保留的 4 种语言（FR-009）
- [X] T012 [P] 更新 [src/lib/i18n.test.ts](../../src/lib/i18n.test.ts)：移除以已下线语言（如 `de-DE`）作为测试输入的用例（FR-009）
- [X] T013 [P] 更新 [src/components/ToolGrid.test.tsx](../../src/components/ToolGrid.test.tsx)：测试数据中移除 `de-DE`/`pt-PT`/`ja`/`zh-TW` 字段（FR-009）
- [X] T014 [P] 更新 [README.md](../../README.md)：语言数量/列表说明从 "8 languages" 更新为 4 种（`en`、`es`、`fr`、`zh`）
- [X] T015 按 [quickstart.md](./quickstart.md) 场景四运行 `pnpm test` 与 `pnpm build`，确认全部通过、无 TypeScript 报错、无回归（SC-003；完成后代码与已修订的 constitution v1.1.0 保持一致）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：无依赖，可立即开始
- **Foundational (Phase 2)**：依赖 Setup 完成；阻塞所有用户故事的验证
- **User Stories (Phase 3-5)**：均依赖 Foundational 完成；三者互不依赖，可任意顺序或并行验证
- **Polish (Phase 6)**：依赖所需的用户故事验证完成

### User Story Dependencies

- **User Story 1 (P1)**：依赖 Foundational（Phase 2）；不依赖其他用户故事
- **User Story 2 (P2)**：依赖 Foundational（Phase 2）；不依赖 US1/US3
- **User Story 3 (P3)**：依赖 Foundational（Phase 2）；不依赖 US1/US2

### Within Each Phase

- Foundational 内：T002（`language.ts`）为其余任务的概念性前提（收缩 `LangKey`），T003–T007 分别修改不同文件，可与 T002 之后并行进行
- 各用户故事内：均只有一个验证任务，Foundational 完成后即可直接执行

### Parallel Opportunities

- Foundational 中 T003、T004、T005、T006、T007 可在 T002 完成后并行执行（均为不同文件）
- Foundational 完成后，T008（US1）、T009（US2）、T010（US3）可并行验证
- Polish 中 T011、T012、T013、T014 可并行执行（不同文件）

---

## Parallel Example: Phase 2 (Foundational，T002 完成后)

```bash
# T003、T004、T005、T006、T007 可同时启动（不同文件，互不阻塞）：
Task: "更新 src/lib/i18n.ts"
Task: "删除 src/locales/de-DE.json、ja.json、pt-PT.json、zh-TW.json"
Task: "更新 src/components/NotesTreeTable.tsx 的 DATE_LOCALE"
Task: "更新 src/data/tools.ts"
Task: "更新 src/data/privacy.ts"
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（收缩语言集合）—— **关键阻塞阶段，也是本功能的主要代码改动**
3. 完成 Phase 3: User Story 1（语言切换下拉框验证）
4. **停止并验证**：按 T008 独立测试 User Story 1
5. 继续 User Story 2、User Story 3（均为验证性任务，成本很低，建议一并完成）

### Incremental Delivery

1. Setup + Foundational → 语言集合已收缩为 4 种，下拉框/路由/404/自动检测全部自动生效
2. 加入 User Story 1 验证 → 确认下拉框符合预期（MVP！）
3. 加入 User Story 2、User Story 3 验证 → 确认旧 URL 404 与浏览器自动检测降级符合预期
4. Polish → 更新测试与 README，运行 `pnpm test`/`pnpm build` 确认整体无回归
