# Quickstart: 批量上传 Markdown 笔记

本指南用于在实现完成后端到端验证功能是否符合 [spec.md](./spec.md) 的验收标准，不包含实现代码。

## 前置条件

```bash
pnpm install
cp .env.local.example .env.local   # 若尚未配置
pnpm db:migrate                    # 本特性无新增迁移，仅确保既有 schema 已就绪
pnpm dev                           # http://localhost:7500
```

以开发环境登录方式（`/signin` 设置 `dev_user_email`/`dev_user_name` cookie，或使用 `DEV_USER_*` 环境变量默认身份）进入控制台。

## 场景一：根目录批量上传（User Story 1，P1）

1. 浏览器访问 `http://localhost:7500/en/console/notes`（确认未选中任何子目录）。
2. 确认 **Upload Notes** 按钮出现在 **New Note** 按钮左侧。点击 **Upload Notes**。
   - **预期**：跳转到 `/en/console/notes/upload`，地址不带 `parentId` 查询参数。
3. 准备本地 3 个测试文件：`a.md`、`b.md`（均 < 2MB，内容任意），以及一个刻意超过 2MB 的 `too-big.md`。点击页面上方文件选择按钮，在系统文件选择框中同时选中这 3 个文件并确认。
   - **预期**：页面下方出现上传队列列表，3 行分别展示文件名、后缀名（`md`）、文件大小、最后修改时间，状态均为"待上传"；`too-big.md` 若按 [research.md](./research.md) 的客户端预校验设计被直接拦截，则该行不应出现在队列中，页面给出简短提示（具体呈现方式由实现决定，属于 UI 细节而非契约）。
4. 点击"开始上传"。
   - **预期**：`a.md`、`b.md` 的状态标签依次从"待上传"变为"成功"；由于文件数 < 3，可同时开始，无需等待并发槽位。
5. 返回 `/en/console/notes`（根目录）。
   - **预期**：列表中出现两条新笔记，标题分别为 `a`、`b`（不含 `.md` 后缀）；点击进入任一篇，正文内容与源文件一致，且未关联频道、未发布（草稿态）。

**对应验收标准**：spec.md User Story 1 的 Acceptance Scenarios 1–4、6；FR-001~FR-006、FR-008、FR-010、FR-011、FR-016。

## 场景二：子目录上传与父级归属（User Story 1，Acceptance Scenario 7）

1. 在 `/en/console/notes` 根目录下，通过既有"新建目录"功能创建一个目录，例如 `工作笔记`，进入该目录（此时地址栏应带 `?parentId=<目录ID>`）。
2. 在目录内点击 **Upload Notes**。
   - **预期**：跳转到 `/en/console/notes/upload?parentId=<目录ID>`（与目录 ID 一致）。
3. 选择一个 `c.md` 文件并完成上传。
4. 返回该子目录（而非根目录）。
   - **预期**：`c` 笔记出现在 `工作笔记` 目录下；切换回根目录列表时不应看到 `c`。

**对应验收标准**：spec.md User Story 1 Acceptance Scenario 7；FR-002、FR-015。

## 场景三：队列内移除文件（User Story 2，P2）

1. 进入上传页面，选择 3 个合规文件加入队列（均为"待上传"，尚未点击"开始上传"）。
2. 点击其中一行的"移除"。
   - **预期**：该行立即从队列消失，其余两行不受影响，队列计数减少为 2。
3. 点击"开始上传"，待某一文件状态变为"成功"后，尝试对该已完成的行执行移除。
   - **预期**：该行不再提供可用的"移除"操作（按钮禁用或不展示），已创建的笔记不受影响。

**对应验收标准**：spec.md User Story 2 Acceptance Scenarios 1–2；FR-007。

## 场景四：失败状态与悬停错误提示（User Story 3，P3 + Edge Cases）

1. 先在根目录手动创建一篇标题为 `dup` 的笔记（通过 **New Note**）。
2. 进入上传页面（根目录），选择一个文件名为 `dup.md` 的文件上传。
   - **预期**：该文件状态变为"失败"；鼠标悬停在状态标签上，出现简短错误说明（如"名称已存在"）。
3. 准备一个 32 个 `.md` 文件的批次（超过 30 个上限）尝试一次性选择。
   - **预期**：队列只接受前 30 个（或达到上限后拒绝继续添加，具体截断策略以实现为准），并提示已达数量上限。
4. 断开本地网络或临时停止 dev server 后点击"开始上传"（或上传过程中中止请求）。
   - **预期**：受影响文件状态变为"失败"，悬停可见简短错误提示，不影响已成功文件的状态。

**对应验收标准**：spec.md User Story 3；Edge Cases 全部条目；FR-012、FR-013、FR-014、FR-017。

## 契约级验证（可选，跳过 UI 直接验证 API）

参见 [contracts/notes-upload-api.md](./contracts/notes-upload-api.md)。示例（需先在浏览器登录后从开发者工具复制 `session_id` cookie，或使用 dev cookie）：

```bash
curl -i -X POST http://localhost:7500/api/console/notes/upload \
  -H "Cookie: dev_user_email=dev@example.com; dev_user_name=Dev" \
  -F "file=@./a.md;type=text/markdown" \
  -F "parentId="
```

- 首次调用预期 `201 Created`，响应体含新建笔记 `id`。
- 使用同一文件名重复调用预期 `409 Conflict`。
- 使用一个 > 2MB 的文件调用预期 `413 Payload Too Large`。
- 使用不存在的 `parentId` 调用预期 `404 Not Found`。

## 自动化测试

实现阶段应在 `src/components/NoteUploadQueue.test.tsx`（队列状态迁移、移除限制、并发调度）与 API 路由的集成测试中覆盖上述场景的关键分支，执行：

```bash
pnpm test
```
