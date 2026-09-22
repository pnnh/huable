---

description: "Task list template for feature implementation"
---

# Tasks: 通过 Calieo 实现 OAuth2/OIDC 登录

**Input**: Design documents from `/specs/002-calieo-oauth-login/`

**Prerequisites**: [plan.md](./plan.md)（必需）、[spec.md](./spec.md)（必需，用户故事）、[research.md](./research.md)、[data-model.md](./data-model.md)、[contracts/calieo-oauth-routes.md](./contracts/calieo-oauth-routes.md)、[quickstart.md](./quickstart.md)

**Tests**: spec.md 未明确要求 TDD/自动化测试，本任务列表不包含自动化测试任务；各用户故事阶段末尾提供对应的 quickstart.md 手动验证任务作为完成标准。

**Organization**: 任务按用户故事分组，以便每个故事可以被独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖）
- **[Story]**: 该任务所属的用户故事（US1/US2/US3）
- 描述中包含确切文件路径

## Path Conventions

单体 Next.js 仓库（App Router），路径均基于仓库根目录 `src/`（见 [plan.md](./plan.md) 的 Project Structure）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 引入依赖与环境变量文档，为后续开发做准备

- [X] T001 [P] 执行 `pnpm add oauth4webapi` 添加运行时依赖（更新 `package.json`/`pnpm-lock.yaml`）
- [X] T002 [P] 在 [.env.local.example](../../.env.local.example) 中补充 `CALIEO_CLIENT_ID`、`CALIEO_CLIENT_SECRET`、`CALIEO_OIDC_REDIRECT_BASE_URL` 占位项，并在 [README.md](../../README.md) 的 Environment Variables 表格中补充说明

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 三个用户故事共同依赖的会话存储与 Calieo 登录/回调链路，必须先完成

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事的实现

- [X] T003 在 [src/db/schema.ts](../../src/db/schema.ts) 中新增 `sessions` 表定义、`sessionsRelations`，并在 `usersRelations` 追加 `sessions: many(sessions)`（字段与约束见 [data-model.md](./data-model.md)）
- [X] T004 运行 `npx drizzle-kit generate` 生成 `migrations/000X_sessions.sql`，随后执行 `pnpm db:migrate` 应用到本地数据库（依赖 T003）
- [X] T005 [P] 新建 [src/lib/calieo.ts](../../src/lib/calieo.ts)：基于 `oauth4webapi` 封装 Calieo OIDC discovery 元数据获取、授权 URL 构造（PKCE + state + nonce）、令牌交换与 ID 令牌校验（签名/`iss`/`aud`/`exp`/`nonce`），对应 [research.md](./research.md) 决策 1 与 [contracts/calieo-oauth-routes.md](./contracts/calieo-oauth-routes.md)
- [X] T006 [P] 新建 [src/lib/session.ts](../../src/lib/session.ts)：实现 `createSession(userId)`、`getSessionUser(sessionId)`、`deleteSession(sessionId)`，基于 `sessions` 表读写（依赖 T003）
- [X] T007 更新 [src/lib/auth.ts](../../src/lib/auth.ts)：导出用户查找/创建辅助函数（`ensureUserRow`）供回调路由复用；将 `getCurrentUser`/`isAuthenticated` 改为优先通过 `session_id` Cookie + `src/lib/session.ts` 解析身份，生产环境不再信任 `CF-Access-Jwt-Assertion` 请求头（FR-012），开发环境保留现有 `dev_user_email`/`dev_user_name` Cookie 回退（依赖 T006）
- [X] T008 新建 [src/app/api/auth/calieo/login/route.ts](../../src/app/api/auth/calieo/login/route.ts)（`export const runtime = "nodejs"`）：生成 state/PKCE/nonce，写入 `calieo_oauth_state` Cookie，302 重定向至 Calieo 授权端点；discovery 失败时按 [contracts/calieo-oauth-routes.md](./contracts/calieo-oauth-routes.md) 回退到 `/{lang}/signin?error=calieo_unavailable`（依赖 T005）
- [X] T009 新建 [src/app/api/auth/calieo/callback/route.ts](../../src/app/api/auth/calieo/callback/route.ts)（`export const runtime = "nodejs"`）：按 [contracts/calieo-oauth-routes.md](./contracts/calieo-oauth-routes.md) 的错误分支表校验 `error`/`state`/PKCE/令牌/`email` 声明，调用 `ensureUserRow` 与 `createSession`，设置 `session_id` Cookie 并清除 `calieo_oauth_state` Cookie，记录安全事件日志（FR-015），302 重定向（依赖 T005、T006、T007）

**Checkpoint**: 会话存储与 Calieo 登录/回调链路就绪，可以开始用户故事实现

---

## Phase 3: User Story 1 - 生产环境用户通过 Calieo 登录进入控制台 (Priority: P1) 🎯 MVP

**Goal**: 生产环境下 `/{lang}/signin` 只提供"通过 Calieo 登录"入口，用户可完成登录并进入控制台

**Independent Test**: 生产构建下打开 `/{lang}/signin`，只看到 Calieo 登录入口；完成一次 Calieo 授权后停留在 `/{lang}/console` 且显示已登录用户信息

### Implementation for User Story 1

- [X] T010 [US1] 更新 [src/app/[lang]/signin/page.tsx](../../src/app/[lang]/signin/page.tsx) 的生产（`!isDev`）分支：移除现有"访问被拒绝"提示，改为渲染"通过 Calieo 登录"按钮（链接至 `/api/auth/calieo/login?lang={lang}`），并在存在 `?error=` 查询参数时展示对应的友好错误提示（FR-008、FR-009）
- [X] T011 [P] [US1] 在 [src/locales](../../src/locales) 下全部 8 个语言文件中新增"通过 Calieo 登录"按钮文案及各错误提示文案的翻译键（对应 [contracts/calieo-oauth-routes.md](./contracts/calieo-oauth-routes.md) 中的 `error` 取值：`calieo_unavailable`、`access_denied`、`invalid_state`、`token_exchange_failed`、`invalid_id_token`、`missing_email`）
- [ ] T012 [US1] 按 [quickstart.md](./quickstart.md) 场景二手动验证：生产构建下 `/{lang}/signin` 仅展示 Calieo 入口，登录成功后进入 `/{lang}/console`，且 Cookie 中仅有不透明的 `session_id`

**Checkpoint**: User Story 1（生产环境登录）应可独立完成并验证

---

## Phase 4: User Story 2 - 开发环境同时支持模拟登录与 Calieo 登录 (Priority: P2)

**Goal**: 开发环境下 `/{lang}/signin` 同时提供模拟登录表单与"通过 Calieo 登录"入口，两者互不影响

**Independent Test**: 本地开发环境下打开 `/{lang}/signin`，确认同时展示两种登录方式，分别走完均可成功进入 `/{lang}/console`

### Implementation for User Story 2

- [X] T013 [US2] 更新 [src/app/[lang]/signin/page.tsx](../../src/app/[lang]/signin/page.tsx) 的开发（`isDev`）分支：在现有模拟登录表单下方新增分隔与"通过 Calieo 登录"按钮（链接至 `/api/auth/calieo/login?lang={lang}`），不改动现有 `handleSignIn` Server Action 逻辑（FR-007）
- [ ] T014 [US2] 按 [quickstart.md](./quickstart.md) 场景一手动验证：开发环境下模拟登录与 Calieo 登录两条路径均可独立成功登录，互不干扰

**Checkpoint**: User Story 1 与 User Story 2 应均可独立工作

---

## Phase 5: User Story 3 - 登出后清除本地会话 (Priority: P3)

**Goal**: 用户登出后，服务端会话记录失效、浏览器会话 Cookie 被清除，且不影响该用户在其他设备上的会话

**Independent Test**: 登录成功后访问 `/{lang}/signout` 并确认登出，随后访问 `/{lang}/console` 应被重定向到 `/{lang}/signin`；其他设备上的会话不受影响

### Implementation for User Story 3

- [X] T015 [US3] 更新 [src/app/[lang]/signout/page.tsx](../../src/app/[lang]/signout/page.tsx) 的 `handleSignOut` Server Action：读取 `session_id` Cookie，调用 `src/lib/session.ts` 的 `deleteSession` 使该条会话失效，清除 `session_id` Cookie，并记录安全事件日志（FR-010、FR-015，依赖 T006）
- [ ] T016 [US3] 按 [quickstart.md](./quickstart.md) 场景三手动验证：两个浏览器分别登录后，其中一个登出不影响另一个的有效会话（SC-006）

**Checkpoint**: 全部三个用户故事应均可独立工作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 影响多个用户故事的收尾工作

- [X] T017 [P] 更新 [README.md](../../README.md) 中的 "Auth note"：说明生产环境改为 Calieo 登录 + 服务端会话机制，移除对 Cloudflare Zero Trust 请求头的描述（FR-012）（已随 T002 一并完成）
- [ ] T018 按 [quickstart.md](./quickstart.md) 场景四手动验证：授权被拒绝、非法 `state`、过期/重放授权码等异常路径均不建立会话（SC-003）
- [X] T019 运行 `pnpm test` 与 `pnpm build`，确认无回归

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**：无依赖，可立即开始
- **Foundational (Phase 2)**：依赖 Setup 完成；阻塞所有用户故事
- **User Stories (Phase 3-5)**：均依赖 Foundational 完成；三者可并行开展（多人协作时），或按优先级顺序 P1 → P2 → P3 依次实现
- **Polish (Phase 6)**：依赖所需的用户故事全部完成

### User Story Dependencies

- **User Story 1 (P1)**：依赖 Foundational（Phase 2）；不依赖其他用户故事
- **User Story 2 (P2)**：依赖 Foundational（Phase 2）；与 US1 修改同一文件的不同分支，但逻辑上互不依赖，可独立实现与验证
- **User Story 3 (P3)**：依赖 Foundational（Phase 2，尤其是 T006 `src/lib/session.ts`）；不依赖 US1/US2 的实现细节

### Within Each Phase

- Foundational 内：T003 → T004（迁移生成依赖 schema 定义）；T005、T006 可与 T003 并行开始；T007 依赖 T006；T008 依赖 T005；T009 依赖 T005、T006、T007
- 各用户故事内：先实现页面/路由改动，再执行对应的 quickstart 手动验证任务

### Parallel Opportunities

- T001、T002 可并行
- T005、T006 可与 T003 并行开始（不同文件）
- Foundational 完成后，T010/T011（US1）、T013（US2）、T015（US3）可由不同开发者并行推进
- T011（i18n 文案）可与 T010 并行（不同文件）

---

## Parallel Example: Phase 2 (Foundational)

```bash
# T003、T005、T006 可同时启动（不同文件，互不阻塞）：
Task: "在 src/db/schema.ts 中新增 sessions 表"
Task: "新建 src/lib/calieo.ts"
Task: "新建 src/lib/session.ts"
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（会话存储 + Calieo 登录/回调链路）—— **关键阻塞阶段**
3. 完成 Phase 3: User Story 1（生产环境 Calieo 登录）
4. **停止并验证**：按 T012 独立测试 User Story 1
5. 若时间/资源允许，再继续 User Story 2、User Story 3

### Incremental Delivery

1. Setup + Foundational → 应用可编译运行，但登录入口尚未接入 UI
2. 加入 User Story 1 → 生产环境可通过 Calieo 登录（MVP！）
3. 加入 User Story 2 → 开发环境同时支持模拟登录与 Calieo 登录
4. 加入 User Story 3 → 登出正确清理会话且不影响其他设备
5. 每个故事完成后都是一个可独立交付、可演示的增量
