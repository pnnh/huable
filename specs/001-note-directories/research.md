# Phase 0 Research: 笔记目录（文件夹）管理

Technical Context 中没有遗留的 `NEEDS CLARIFICATION` 项。本文档记录为落地该特性所做的关键技术决策及取舍，供 Phase 1 设计参考。

## 1. 子级导航的 URL 参数形式

- **Decision**: 子级列表沿用同一路由 `/[lang]/console/notes`，通过 query string `?parentId=<base58Id>` 传递父目录 ID；服务端组件依据 `searchParams.parentId` 查询该目录下的直接子级。
- **Rationale**: 用户需求原文为"点击目录项**传参**进入子级列表页面"，未要求引入新的动态路由段；使用 query string 可在不新增路由文件的前提下复用同一页面的树形表格渲染逻辑，改动面更小，且与现有 `/[lang]/console/notes` 路径保持完全一致（无需为每一级目录生成嵌套路径）。
- **Alternatives considered**:
  - 动态路由段 `/[lang]/console/notes/dir/[parentId]`：需要新增路由文件、面包屑逻辑更复杂，且与"树形表格页面"本身应保持单一路由的直觉不符。
  - 客户端路由状态（不写入 URL）：不满足 SC-004"刷新页面后仍停留在该子级视图"的要求。

## 2. 目录 ID 的编码方式

- **Decision**: 直接复用 `src/db/schema.ts` 中已有的 `createId()` / `encodeUuidToBase58()`，目录与笔记共用同一 ID 生成与编码机制，`parentId` query 参数值即为目录记录的 `id`（已经是 Base58 字符串,无需额外编解码层）。
- **Rationale**: 用户要求 `parentId` 的 URL 展现风格与现有笔记详情页 ID（如 `Cdc6ZFomke37Vz84fqNEm`）一致；由于目录本身就是 `notes` 表中的一条记录，其主键已经是通过同一函数生成的 Base58 值，天然满足风格一致性要求，无需引入新的编码方案。
- **Alternatives considered**: 为目录单独设计短 ID 或数字自增 ID——会引入与笔记 ID 不一致的两套风格，且需要额外的转换逻辑，违背"风格一致"的明确要求。

## 3. 子级懒加载 vs 一次性加载整棵树

- **Decision**: 页面首次渲染仅服务端查询当前层级（`parent_id` 等于当前 `parentId` 或为空）的直接子级列表，并为每个目录条目附带一个 `hasChildren` 布尔标记（通过 `COUNT` 子查询预计算）。点击三角图标展开时，客户端组件通过一个轻量 API 按需拉取该目录的直接子级并原地渲染，不会一次性加载整棵树。
- **Rationale**: 匹配 Edge Case 中"仅在用户实际点击展开时才加载/渲染该层级"的预期行为；避免笔记/目录数量增长后首屏一次性查询整棵树带来的不必要开销；`hasChildren` 标记确保没有子级的目录不会展示可点击但空转的三角图标之外的额外请求。
- **Alternatives considered**: 首次渲染即返回整棵树的嵌套 JSON 交给客户端全部渲染——实现更简单，但与 Edge Case 描述的按需加载预期不符，且在目录层级加深、条目变多时首屏数据量不可控。

## 4. 目录创建的提交方式

- **Decision**: 新增一个客户端弹窗组件（对话框内含名称/描述表单），提交时通过 `fetch` 调用新增的 API Route（`POST /api/console/notes` 或专用的目录创建端点），而不是像现有笔记创建那样整页跳转到 `/console/notes/new` 再提交 Server Action 表单。
- **Rationale**: 需求明确是"点击弹框提示用户输入…点击确认后保存"，属于停留在当前列表页的模态交互，与现有笔记新建的整页表单流程（`NoteEditorPage`）在交互形态上不同；使用 API Route + 客户端 `fetch` 更符合"弹窗内完成、无需跳转"的体验，且失败时（如重名）可直接在弹窗内展示错误而不离开当前树形表格上下文。
- **Alternatives considered**: 复用 `NoteEditorPage` 的 Server Action 表单模式并整页跳转——不满足"弹窗确认保存"的交互要求。

## 5. 同层级重名校验的实现层

- **Decision**: 在应用层（API Route 处理函数内）执行"同 `userId` + 同 `parent_id` 下标题不可重复"的校验（查询后判断），而不是仅依赖数据库唯一约束。
- **Rationale**: `parent_id` 允许为 `NULL`（根目录），而 SQL 唯一索引对多个 `NULL` 值默认不视为冲突（SQLite/D1 均如此），无法仅靠 `UNIQUE(user_id, parent_id, title)` 索引覆盖根目录场景下的重名校验；因此需要在应用层显式查询同层级下是否已存在同名条目（不区分目录与笔记）。
- **Alternatives considered**: 引入应用层校验 + 数据库唯一约束双重保障——可作为后续增强，但本次为保持改动最小化，先以应用层校验满足功能需求（记录为可选的后续加固项，见 [data-model.md](./data-model.md) 中的说明）。
