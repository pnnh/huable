# Phase 0 Research: 批量上传 Markdown 笔记

Technical Context 中无 `NEEDS CLARIFICATION` 项——技术栈、存储、鉴权模式均已由仓库既有实现（`001-note-directories` 特性、`AttachmentPanel`/`CreateDirectoryDialog` 等组件、`src/app/api/console/*` 路由）确定。本阶段记录的是在既定技术栈约束下，本特性需要做出的关键设计取舍。

## 1. 文件选择与元数据获取方式

**Decision**: 使用原生 `<input type="file" multiple accept=".md,.markdown">`；文件的名称、大小、最后修改时间直接来自浏览器返回的标准 `File` 对象（`file.name`/`file.size`/`file.lastModified`），文本内容通过 `file.text()` 读取。

**Rationale**: `<input type="file">` 在所有目标浏览器上均原生支持，选择体验与现有 `AttachmentPanel.tsx` 一致（同样使用文件选择 input），不引入权限弹窗或额外的兼容性负担；`File` 对象本身已具备 spec 要求展示的全部元数据字段（名称、后缀、大小、修改时间），无需额外 API。

**Alternatives considered**: File System Access API（`window.showOpenFilePicker()`）——虽然名字更贴合用户描述中的"浏览器文件系统API"措辞，但该 API 在 Safari/Firefox 上支持不完整，且仅返回 `FileSystemFileHandle`，仍需额外一步 `getFile()` 转换为 `File` 对象才能获得同样的元数据，对本场景（一次性选择、无需持久句柄/后续再次读写）没有额外价值，反而增加兼容性风险，故不采用。

## 2. 客户端并发上传控制

**Decision**: 在 `NoteUploadQueue.tsx` 内实现一个约 10 行的最小并发池：维护"进行中"计数，每完成一个文件的上传（成功或失败）后从"待上传"队列中取出下一个继续，直至同时进行中的请求数达到 `MAX_CONCURRENT_UPLOADS`（3）为止。

**Rationale**: 符合宪法"简洁优先"原则——3 路并发的调度逻辑无需引入第三方队列/并发库（如 `p-limit`），自实现更易审查且不增加依赖体积。

**Alternatives considered**: 引入 `p-limit` 或类似库——对于固定 3 并发、总量 ≤30 的场景过度设计，且是本项目当前依赖中没有先例的新增依赖，与既有代码风格（无并发控制库）不一致，故不采用。

## 3. 上传请求的接口形态：单文件多次请求 vs. 单次批量请求

**Decision**: 新增 `POST /api/console/notes/upload`，每次请求携带一个文件（`multipart/form-data`，字段 `file` + `parentId`），由客户端并发池按 3 路并发分别调用；服务端返回该文件对应的成功/失败结果。

**Rationale**: 与现有 `/api/console/upload`（笔记附件上传）保持同样的"单文件一次请求"接口风格，实现和调用方式都可直接复用既有模式；更重要的是，spec FR-010 要求"每个文件处理完成后更新该文件的状态，不影响其他文件"——单文件请求使每个文件的成功/失败天然独立，无需在一个请求内处理部分成功的复杂响应结构。

**Alternatives considered**: 单次请求携带全部选中文件——服务端需要在一个 HTTP 响应中表达"部分文件成功、部分失败"的组合结果，客户端也需要等待整批完成才能更新任意一个文件的状态标签，与"每完成一个文件就独立更新其状态"的验收标准冲突，故不采用。

## 4. 新建笔记的字段映射

**Decision**: 每个成功上传的文件对应插入一条 `notes` 记录：`title` = 文件名去除 `.md`/`.markdown` 后缀，`body` = 文件文本内容，`mimeType` = `"text/markdown"`，`channelId` = `null`，`isPublished` = `false`，`approvalStatus` = `"approved"`，`parentId` = 上传页面接收到的目录上下文。

**Rationale**: 与 spec.md 的 Assumptions 一致：新笔记默认未发布、不关联频道，用户后续可在笔记编辑页手动设置；`approvalStatus` 沿用 `directories/route.ts` 中"非发布内容直接 approved"的既有默认值语义（审批仅在发布至频道时触发，参见 `[noteId]/page.tsx` 中 `needsApproval` 的判定逻辑）。

**Alternatives considered**: 无——该映射是唯一与现有笔记创建流程（手动 "New Note"）保持字段语义一致的方案。

## 5. 同名冲突与父目录校验

**Decision**: 服务端路由复用 `src/lib/notesTree.ts` 中已有的 `resolveOwnedDirectory(db, userId, parentId)`（校验父目录存在且属于当前用户）与 `assertUniqueNameInParent(db, userId, parentId, title)`（校验同层级无重名），与 `directories/route.ts`、`[noteId]/page.tsx` 的 `handleSave` 完全一致的校验顺序与错误类型（`DirectoryNotFoundError` → 404，`NameConflictError` → 409）。

**Rationale**: 避免重复实现同一条业务规则（DRY），保证批量上传创建的笔记与手动创建、目录创建三者的命名唯一性语义完全一致，符合宪法"精准手术式修改"（复用而非重写）与"需求诚实性"（不引入 spec 未提及的新冲突处理策略）原则。

**Alternatives considered**: 无——直接复用是唯一合理选择。

## 6. 大小/数量/并发限制的常量共享

**Decision**: 新增 `src/lib/noteUploadLimits.ts`，导出 `MAX_QUEUE_SIZE = 30`、`MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024`、`MAX_CONCURRENT_UPLOADS = 3`、`ALLOWED_EXTENSIONS = [".md", ".markdown"]`；`NoteUploadQueue.tsx`（客户端，用于选择/加入队列时的即时校验与并发调度）与 `api/console/notes/upload/route.ts`（服务端，用于请求体的最终校验）共同从该模块导入。

**Rationale**: spec 要求这些限制"以常量形式硬编码"；将其集中到一个模块可避免客户端与服务端各自写一份数字导致后续修改遗漏（与 `src/app/api/console/user/avatar/route.ts` 等现有路由各自内联 `MAX_SIZE` 常量的做法相比，本特性涉及客户端+服务端两处校验点，集中定义能防止两侧数值漂移）。

**Alternatives considered**: 分别在客户端组件与 API 路由内联定义各自的常量（参照 `avatar/route.ts` 的既有写法，该场景只有服务端一处校验点）——本特性有客户端预校验与服务端二次校验两处，内联会产生重复数字，维护成本更高，故选择共享模块。

## 7. 父目录上下文的传递方式

**Decision**: 沿用 `New Note` 链接的既有模式：列表页按当前 `parentId`（若非空）拼接查询参数跳转到 `/{lang}/console/notes/upload?parentId={parentId}`；上传页面（Server Component）从 `searchParams` 读取 `parentId` 并作为 prop 传给 `NoteUploadQueue`；客户端组件在每个文件的上传请求中携带该 `parentId`。

**Rationale**: 与 `[noteId]/page.tsx`（`New Note` 页面）读取 `parentId` 的方式完全一致，无需引入新的状态传递机制（如 Context、Cookie），符合"精准手术式修改"与既有代码风格。

**Alternatives considered**: 无——直接复用现有模式。

**Output**: 以上 7 项设计决策均已确定，无遗留的 `NEEDS CLARIFICATION` 项，可进入 Phase 1。
