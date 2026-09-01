# Implementation Plan: 通过 Calieo 实现 OAuth2/OIDC 登录

**Branch**: `002-calieo-oauth-login` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-calieo-oauth-login/spec.md`

## Summary

在 `/{lang}/signin` 增加"通过 Calieo 登录"入口，使用 `oauth4webapi` 实现 Authorization Code Flow + PKCE 对接 Calieo（`https://portal.calieo.xyz`，标准 OIDC Provider）。登录成功后，服务端在数据库新增的 `sessions` 表中创建一条会话记录，浏览器仅保存不透明的会话 ID Cookie；生产环境完全由该机制取代现有的 Cloudflare Zero Trust（`CF-Access-Jwt-Assertion`）身份识别路径，开发环境保留现有的邮箱/用户名模拟登录并与 Calieo 登录并存。同一用户支持多设备并发会话，登出仅使当前会话失效；关键安全事件写入应用日志；登录/回调端点的速率限制交由 Cloudflare 边缘层负责。

## Technical Context

**Language/Version**: TypeScript 5（strict），Next.js 16 App Router，React 19

**Primary Dependencies**: `drizzle-orm`（既有 ORM）、`oauth4webapi`（新增，零依赖 OIDC 客户端）、Next.js Route Handlers（`next/server`）

**Storage**: SQLite（`better-sqlite3`，开发环境）/ Cloudflare D1（生产环境），通过 Drizzle ORM 统一访问；新增 `sessions` 表

**Testing**: Vitest + `@testing-library/react`（现有 `vitest.config.ts`/`vitest.setup.ts`），沿用仓库现有的 `*.test.ts(x)` 约定

**Target Platform**: Cloudflare Workers（通过 OpenNext 部署，`nodejs_compat` 已开启）；本地开发使用 `next dev`（Node.js）

**Project Type**: 单体 Next.js 全栈应用（无独立前后端分离），沿用现有 `src/app`、`src/lib`、`src/db` 结构

**Performance Goals**: 无专门性能指标；登录跳转与回调处理应在正常网络条件下与现有页面导航体验一致（无长耗时同步阻塞操作）

**Constraints**: 必须在 Cloudflare Workers 运行时可用（`oauth4webapi` 基于 Web Crypto API，天然兼容）；会话 Cookie 必须为 `HttpOnly` + 生产环境 `Secure`；不得在 Cookie 中携带可解读的用户信息；速率限制不在应用代码实现范围

**Scale/Scope**: 单一登录/登出链路改造；新增 1 张数据库表（`sessions`）、2 个 API 路由（登录发起 + 回调）、`src/lib/auth.ts` 会话校验逻辑改造、`/{lang}/signin`、`/{lang}/signout` 页面调整

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 仍为初始模板占位符，项目尚未正式确立具体宪法条款/门禁规则。因此本阶段不设额外强制门禁，仅遵循仓库现有的通用工程实践（TypeScript 严格模式、Drizzle 迁移流程、Vitest 测试约定、OWASP 安全基线）。若后续补全宪法文件，需回溯本计划做合规复核。

**Re-check (Post-Phase 1)**: 设计产出（data-model.md、contracts/、quickstart.md）未引入需要豁免的架构复杂度（未新增独立项目/服务，未引入新的运行时或部署目标），门禁维持通过。

## Project Structure

### Documentation (this feature)

```text
specs/002-calieo-oauth-login/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── calieo-oauth-routes.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [lang]/
│   │   ├── signin/page.tsx        # 改造：dev 同时展示模拟登录表单 + Calieo 按钮；prod 仅展示 Calieo 按钮
│   │   └── signout/page.tsx       # 改造：登出时同时失效服务端会话记录并清除会话 Cookie
│   └── api/
│       └── auth/
│           └── calieo/
│               ├── login/route.ts     # 新增：生成 state/PKCE/nonce，重定向至 Calieo 授权端点
│               └── callback/route.ts  # 新增：校验 state/PKCE，兑换令牌，校验 ID 令牌，创建会话
├── lib/
│   ├── auth.ts                    # 改造：会话 Cookie 校验取代生产环境 CF-Access-Jwt-Assertion 路径
│   ├── calieo.ts                  # 新增：oauth4webapi client/discovery 封装
│   └── session.ts                 # 新增：会话创建/校验/失效的数据库操作封装
├── db/
│   └── schema.ts                  # 改造：新增 `sessions` 表定义
migrations/
└── 0006_sessions.sql              # 新增：drizzle-kit 生成的 sessions 表迁移
```

**Structure Decision**: 沿用现有单体 Next.js 仓库结构（无需拆分 frontend/backend 或新增独立项目）。新增内容集中在 `src/app/api/auth/calieo/`（两个 Route Handler，遵循仓库现有 `export const runtime = "nodejs"` 约定）与 `src/lib/`（两个新模块），并对 `src/db/schema.ts` 追加一张表；`/{lang}/signin`、`/{lang}/signout`、`src/lib/auth.ts` 做针对性改造，不引入新的顶层目录。

## Complexity Tracking

> 无宪法门禁违反项，本节留空。
