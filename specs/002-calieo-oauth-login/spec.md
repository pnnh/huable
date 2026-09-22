# Feature Specification: 通过 Calieo 实现 OAuth2/OIDC 登录

**Feature Branch**: `002-calieo-oauth-login`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "目前该项目已经实现了/en/signin和/en/signout页面，方便在开发阶段验证用户登录行为。现在需要在/en/signin增加"通过Calieo登录"功能。其中"Calieo"是一种OAuth2 OIDC认证提供程序，地址是<https://portal.calieo.xyz> 在开发环境下，保留现有的输入邮箱和用户名模拟登录功能以方便调试，同时开放 Calieo 登录功能。但是在发布到生产环境后，仅保留"通过Calieo登录"功能。可以使用 oauth4webapi npm库（OpenID 认证、无依赖、Cloudflare Workers 原生兼容）实现 Authorization Code Flow + PKCE。"

## Clarifications

### Session 2026-09-01

- Q: 同一用户是否允许在多个设备/浏览器上同时保持独立的有效登录会话？ → A: 允许多会话并存，登出仅使当前会话失效
- Q: 是否需要在应用层为 Calieo 登录发起与回调端点增加速率限制以防御暴力破解/滥用？ → A: 本期不在应用层实现，交由 Cloudflare 边缘层（WAF/Rate Limiting）防护
- Q: 是否需要记录登录相关的安全事件（授权失败、state/PKCE 校验失败、会话创建与失效）用于审计排查？ → A: 记录关键安全事件到应用日志

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 生产环境用户通过 Calieo 登录进入控制台 (Priority: P1)

生产环境的访客在 `/{lang}/signin` 页面上只看到"通过 Calieo 登录"入口。点击后跳转到 Calieo 完成身份验证并授权，浏览器被重定向回站点，系统识别其身份并进入 `/{lang}/console`。

**Why this priority**: 这是生产环境唯一可用的登录方式，是整个功能上线后价值的核心来源；没有它，生产环境用户完全无法登录。

**Independent Test**: 在生产构建/环境下打开 `/{lang}/signin`，只能看到 Calieo 登录入口；完成一次真实（或模拟的）Calieo 授权流程后，浏览器停留在 `/{lang}/console` 且显示已登录用户信息。

**Acceptance Scenarios**:

1. **Given** 生产环境下未登录用户访问 `/{lang}/signin`，**When** 页面渲染完成，**Then** 页面只展示"通过 Calieo 登录"按钮，不展示邮箱/用户名模拟登录表单。
2. **Given** 用户点击"通过 Calieo 登录"按钮，**When** 用户在 Calieo 完成登录并同意授权，**Then** 浏览器被重定向回站点回调地址，系统换取令牌成功后建立会话并跳转至 `/{lang}/console`。
3. **Given** 用户是首次通过 Calieo 登录，**When** 授权成功，**Then** 系统按邮箱自动创建对应用户记录（复用现有用户创建规则），并使该用户可以访问控制台。
4. **Given** 用户之前已用同一邮箱登录过（无论通过何种方式），**When** 再次通过 Calieo 登录成功，**Then** 系统匹配到已存在的用户记录（内部 id 不变），而不是重复创建新用户。

---

### User Story 2 - 开发环境同时支持模拟登录与 Calieo 登录 (Priority: P2)

开发人员在本地开发环境下访问 `/{lang}/signin`，可以自由选择使用"输入邮箱/用户名"的模拟登录，或使用"通过 Calieo 登录"来验证真实登录链路，两种方式互不影响、互不干扰。

**Why this priority**: 保证开发阶段调试效率（模拟登录）的同时，也能在合入生产前验证真实 Calieo 登录链路是否可用；这是保障功能质量的关键手段，但不直接面向最终生产用户。

**Independent Test**: 在本地开发环境（`NODE_ENV=development`）下打开 `/{lang}/signin`，确认页面同时展示模拟登录表单和 Calieo 登录按钮；分别走完两条路径，均可成功进入 `/{lang}/console` 且身份信息正确。

**Acceptance Scenarios**:

1. **Given** 开发环境下访问 `/{lang}/signin`，**When** 页面渲染完成，**Then** 页面同时展示模拟登录表单与"通过 Calieo 登录"按钮。
2. **Given** 开发环境下，**When** 开发者使用模拟登录表单提交邮箱/用户名，**Then** 行为与当前实现一致（不受本功能影响），成功登录并跳转控制台。
3. **Given** 开发环境下，**When** 开发者点击"通过 Calieo 登录"并完成授权，**Then** 与生产环境相同的登录链路被触发，成功后跳转控制台。

---

### User Story 3 - 登出后清除本地会话 (Priority: P3)

已登录用户（无论通过模拟登录还是 Calieo 登录）访问 `/{lang}/signout` 并确认登出后，本地会话被清除，再次访问需要登录的页面时会被要求重新登录。

**Why this priority**: 保证登录状态可以被正确终止，是登录功能闭环的必要部分，但优先级低于让用户能够登录本身。

**Independent Test**: 登录成功后访问 `/{lang}/signout` 并确认登出，随后访问 `/{lang}/console` 应被重定向到 `/{lang}/signin`。

**Acceptance Scenarios**:

1. **Given** 用户已通过 Calieo 登录，**When** 用户在 `/{lang}/signout` 确认登出，**Then** 本地会话状态被清除。
2. **Given** 用户已登出，**When** 用户再次访问需要登录的控制台页面，**Then** 系统将其重定向至 `/{lang}/signin`。

---

### Edge Cases

- 用户在 Calieo 授权页面拒绝授权或主动取消：系统必须回到 `/{lang}/signin` 并展示友好错误提示，且不得建立任何会话。
- 回调请求中的 `state` 参数与发起授权时保存的值不一致（可能是 CSRF、重放或链接被篡改）：系统必须拒绝该次登录，不建立会话，并提示错误。
- PKCE 校验失败（`code_verifier` 与 `code_challenge` 不匹配）：系统必须拒绝该次登录。
- Calieo 返回的授权码已过期或已被使用过一次：系统必须拒绝该次登录并提示用户重新发起登录。
- Calieo 服务不可用或网络超时：系统必须向用户展示清晰的错误提示，并允许用户重试。
- Calieo 返回的身份声明中缺少邮箱（email）：系统必须拒绝该次登录并提示错误（因为邮箱是用户身份匹配的关键字段）。
- 用户直接访问登录回调地址（无合法的授权状态）：系统必须拒绝该请求，不建立会话。
- 已登录用户重复点击"通过 Calieo 登录"：系统应直接视为已登录，跳转至控制台（不应导致异常或重复创建用户）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须在 `/{lang}/signin` 页面提供"通过 Calieo 登录"入口，点击后将用户重定向至 Calieo 的授权端点，发起 Authorization Code Flow + PKCE 登录请求。
- **FR-002**: 系统必须为每次登录请求生成唯一的 `state` 值与 PKCE `code_verifier`/`code_challenge` 对，并在回调时校验两者，防止 CSRF 与授权码拦截攻击；校验失败必须拒绝登录。
- **FR-003**: 系统必须提供登录回调路由，接收 Calieo 返回的授权码，使用 `oauth4webapi` 向 Calieo 的 token 端点换取访问令牌与 ID 令牌。
- **FR-004**: 系统必须校验 ID 令牌的签名、颁发者（issuer）、受众（audience/client_id）与有效期，任一校验失败必须拒绝登录。
- **FR-005**: 系统必须从 ID 令牌声明中提取用户邮箱与姓名，并复用现有的用户查找/创建逻辑（按邮箱唯一匹配；不存在则创建新用户；首个登录用户自动提升为管理员），确保同一邮箱在不同登录方式下对应同一个内部用户记录。
- **FR-006**: 登录成功后，系统必须为该浏览器会话建立已登录状态，并将用户重定向至 `/{lang}/console`。
- **FR-007**: 在开发环境（`NODE_ENV=development`）下，`/{lang}/signin` 页面必须同时展示现有的邮箱/用户名模拟登录表单与"通过 Calieo 登录"入口，且两者互不影响。
- **FR-008**: 在非开发环境（生产）下，`/{lang}/signin` 页面必须仅展示"通过 Calieo 登录"入口，不得展示或提交模拟登录表单。
- **FR-009**: 系统必须处理用户拒绝授权、授权码过期/失效、Calieo 服务不可用等失败场景，向用户展示友好的错误提示，并且不得建立任何会话。
- **FR-010**: 系统必须支持登出操作：使当前浏览器对应的服务端会话记录失效（删除或标记失效）并清除浏览器中的会话 Cookie，登出后访问需登录页面必须被重定向至 `/{lang}/signin`；该操作只使当前会话失效，不影响同一用户在其他设备/浏览器上的有效会话。
- **FR-011**: 生产环境下的登录会话必须采用服务端会话存储机制：会话数据（用户 id、创建时间、过期时间等）保存在数据库的会话表中，浏览器 Cookie 中仅携带不透明的会话 ID，不携带任何可被解读或伪造的用户信息；服务端必须能够随时使某个会话失效。
- **FR-012**: 系统必须完全由 Calieo 登录取代生产环境现有的 Cloudflare Zero Trust（`CF-Access-Jwt-Assertion` 请求头）身份识别路径；上线后，生产环境的身份识别不再依赖该请求头。
- **FR-013**: 登录会话必须设置固定有效期（约 7～30 天），到期后会话自动失效，用户必须通过 `/{lang}/signin` 重新完成登录（不使用 refresh token 静默续期）。
- **FR-014**: 系统必须支持同一用户同时拥有多个独立的有效会话（多设备/多浏览器并存），会话表按一对多关系设计（一个用户对应多条会话记录）。
- **FR-015**: 系统必须记录登录相关的关键安全事件（包括但不限于：授权被拒绝、`state`/PKCE 校验失败、ID 令牌校验失败、会话创建、会话失效/登出）到应用日志，用于事后审计与问题排查。

### Key Entities *(include if feature involves data)*

- **OAuth 登录请求状态（临时）**：记录一次登录尝试所需的 `state`、PKCE `code_verifier`、`nonce` 等临时数据，仅在授权请求发起到回调完成期间有效，用于回调时校验，之后应立即失效/清除。
- **用户会话（服务端存储）**：数据库中的会话记录，包含不透明会话 ID、关联的用户内部 id、创建时间与过期时间（固定 7～30 天）；浏览器 Cookie 仅存放该会话 ID，服务端据此查表校验并可随时使会话失效。同一用户可对应多条并存的会话记录（一对多），登出仅移除当前这一条。
- **用户（已存在实体，复用）**：站点已有的用户记录，以邮箱作为跨登录方式的唯一身份标识；本功能不新增用户属性，仅确保 Calieo 登录能够正确匹配/创建该记录。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 生产环境下，用户从点击"通过 Calieo 登录"到成功进入控制台，全程无需任何手工模拟登录步骤，且流程中不出现现有模拟登录表单。
- **SC-002**: 开发环境下，模拟登录与 Calieo 登录两条路径均可独立、成功地完成登录，互不干扰，且不影响本功能上线前已有的开发调试体验。
- **SC-003**: 100% 的异常登录尝试（`state` 不匹配、PKCE 校验失败、令牌校验失败、授权被拒绝）都不会建立登录会话。
- **SC-004**: 同一邮箱无论首次还是多次通过 Calieo 登录，都对应同一个内部用户 id，不产生重复用户记录。
- **SC-005**: 用户登出后，再次访问需要登录的页面会被要求重新登录，不存在会话残留导致的越权访问。
- **SC-006**: 用户在一个设备/浏览器上登出后，其在其他设备/浏览器上已建立的有效会话不受影响，仍可正常访问控制台。

## Assumptions

- 复用现有 `ensureUserRow` 用户查找/创建逻辑：按邮箱唯一匹配已存在用户，不存在则创建新用户，首个登录的用户自动提升为管理员；本功能不改变该规则。
- Calieo（`https://portal.calieo.xyz`）是标准的 OIDC Provider，提供标准的 discovery 文档（`/.well-known/openid-configuration`）、`authorization_endpoint`、`token_endpoint`，并在 ID 令牌中返回 `email`、`name` 等声明。
- 使用 `oauth4webapi` 以 confidential client 方式（`CALIEO_CLIENT_ID`/`CALIEO_CLIENT_SECRET`）实现 Authorization Code Flow + PKCE；相关客户端凭据与回调地址（基于 `CALIEO_OIDC_REDIRECT_BASE_URL`）已经/将会配置在环境变量与生产环境密钥中。
- 登出操作默认只使应用侧的服务端会话记录失效并清除会话 Cookie；是否需要同时触发 Calieo 远端会话登出（RP-Initiated Logout）由实现阶段根据 Calieo 是否提供 `end_session_endpoint` 决定，不影响本功能的用户可见行为范围。
- 本功能仅涉及登录/登出与身份识别链路，不改变现有控制台内基于 `sysrole`（admin/normal）的权限模型。
- 多语言路由（`/{lang}/signin`、`/{lang}/console` 等）保持现有约定，Calieo 登录回调完成后按发起登录时的语言重定向。
- 生产环境上线后，现有基于 `CF-Access-Jwt-Assertion` 请求头的 Cloudflare Zero Trust 身份识别路径将被完全移除/停用，不再作为生产环境的身份来源。
- 会话数据存储在项目现有数据库（开发环境 SQLite、生产环境 Cloudflare D1）中新增的会话表内，与 `users` 表关联；本功能范围包含该表的设计与迁移。
- 登录/回调端点的速率限制与暴力破解防护由 Cloudflare 边缘层（WAF/Rate Limiting 规则）负责，不属于本功能应用代码的实现范围。
- 安全事件日志（授权失败、state/PKCE/令牌校验失败、会话创建与失效）写入项目现有的应用日志输出，不要求新增独立的日志存储或可视化系统。
