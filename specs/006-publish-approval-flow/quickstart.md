# Quickstart 验证指南：笔记与频道的保存/发布分离及审核流程简化

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-22

本指南用于在实现完成后端到端验证功能是否符合预期，覆盖 spec.md 全部 User Story 的核心路径。执行前需先完成 `/speckit-tasks` + `/speckit-implement`。

## 前置条件

```bash
pnpm install
cp .env.local.example .env.local
pnpm db:migrate   # 应用全部迁移，含本功能新增的 migrations/0007_publish_approval_flow.sql
pnpm dev          # http://localhost:7500
```

需要两个测试账号：一个 `sysrole = "normal"`（默认新用户），一个 `sysrole = "admin"`（本地首个注册用户会自动成为 admin，参考 `src/lib/auth.ts`）。

## 场景 1：保存与发布解耦（User Story 1）

1. 以普通用户登录，进入 `/en/console/notes/new`，填写标题正文，点击保存。
2. 打开该笔记编辑页，确认状态标识显示"未发布"（FR-020）。
3. 以管理员登录 `/en/console/approvals`，确认列表中**没有**出现这条笔记。
4. 回到普通用户，编辑该笔记内容并再次保存，状态仍为"未发布"。

**预期**：全程无待审核事件产生。

## 场景 2：笔记发布（User Story 2）+ 复合可见性（Clarifications）

1. 普通用户创建一个频道并发布（见场景 3），使其进入 `pending` 或 `approved`。
2. 编辑场景 1 中的笔记，点击"发布"，弹窗中选择该频道并确认。
3. 若频道尚未 `approved`：以管理员批准频道的待审核事件。
4. 若笔记发布人不是管理员：以管理员在 `/en/console/approvals` 找到该笔记的待审核事件并点击"批准"。
5. 访问 `/en/`（公开首页）与 `/en/notes/{noteId}`，确认笔记出现。
6. 以管理员将该频道重新编辑并保存（不点发布），频道回退为"未发布"。
7. 刷新 `/en/` 与 `/en/notes/{noteId}`，确认笔记**不再出现**（尽管笔记自身仍是 `approved`）。

**预期**：只有笔记与所属频道同时 `approved`，公开页面才展示；任一方回退都会立即隐藏（FR-007/FR-018/SC-006）。

## 场景 3：频道发布二次确认（User Story 3）

1. 普通用户进入频道编辑页，点击"发布"。
2. 确认弹出二次确认弹窗（仅确认/取消，无频道选择）。
3. 点击取消，确认频道状态未变化、未产生待审核事件。
4. 再次点击"发布"并确认，确认频道状态变为"待审核"并在管理员审核列表出现。

## 场景 4：管理员免审核发布（User Story 2/3 的管理员分支）

1. 以管理员账号创建一篇笔记并发布（选择一个已 `approved` 的频道）。
2. 确认笔记状态直接变为"已审核"，管理员审核列表中**没有**新增事件。
3. 对频道重复同样验证。

## 场景 5：批量发布（User Story 4）

1. 普通用户在 `/en/console/notes` 勾选 3 篇草稿笔记。
2. 确认工具栏只有一个"批量发布"按钮（原"设置频道"“设置发布状态"已合并）。
3. 点击"批量发布"，选择一个频道并确认。
4. 确认这 3 篇笔记的频道字段与状态按发布规则更新，其余未勾选笔记不受影响。

## 场景 6：批量上传保持草稿（User Story 5，回归验证）

1. 通过 `/en/console/notes/upload` 批量上传若干 Markdown 文件。
2. 确认新建的笔记频道字段为空、状态为"未发布"。
3. 确认管理员审核列表没有新增记录。

## 场景 7：拒绝后重新编辑发布（User Story 6）

1. 普通用户发布一篇笔记（进入 `pending`）。
2. 管理员在待审核事件详情页点击"拒绝"。
3. 确认笔记状态变为"已拒绝"，且不出现在公开页面。
4. 所有者打开该笔记编辑页，确认看到"已拒绝"标记。
5. 编辑内容并点击保存，确认状态变为"未发布"。
6. 再次点击"发布"，确认可重新生成一条新的待审核事件。

## 场景 8：待审核期间再次编辑作废事件（Edge Case / FR-017）

1. 普通用户发布一篇笔记，状态进入 `pending`。
2. 管理员**尚未处理**该事件前，所有者编辑该笔记内容并点击保存（不点发布）。
3. 确认笔记状态回退为"未发布"。
4. 管理员刷新 `/en/console/approvals`，确认原事件不再出现在待处理列表中。

## 场景 9：状态标识展示（User Story 7）

1. 依次将同一篇笔记置于四种状态（未发布/待审核/已审核/已拒绝）。
2. 每次都打开其编辑页与 `/en/console/notes` 列表页，确认状态标识与实际状态一致。
3. 对频道重复同样验证（编辑页 + `/en/console/channels` 列表页）。

## 自动化测试

实现阶段应在以下既有测试文件旁补充/更新用例（沿用 Vitest + Testing Library 约定）：

- `src/app/api/console/notes/batch/route.test.ts`：更新为新的请求/响应契约（见 `contracts/notes-batch-publish.md`）。
- `src/components/NotesConsole.test.tsx`：批量工具栏合并后的交互测试。
- 新增：笔记/频道发布端点的 route 测试，覆盖管理员免审核分支与非管理员待审核分支。
- 新增：审核拒绝分支（`approvals/[eventId]/route.ts`）回写 `approval_status = "rejected"` 的测试。

验证命令：

```bash
pnpm test         # 运行 Vitest 测试套件
pnpm build        # TypeScript 类型检查随 Next.js build 一并执行
```
