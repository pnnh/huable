# API Contract: 批量上传 Markdown 笔记

范围：内部 Console API（复用现有 `requireConsoleAuth` 鉴权与按 `userId` 隔离的模型），供 `/{lang}/console/notes/upload` 页面的 `NoteUploadQueue` 客户端组件逐文件调用（每个文件一次独立请求，由客户端并发池按最多 3 路并发调度）。

## POST /api/console/notes/upload

上传单个 Markdown 文件并创建为一篇新笔记。

**Request**: `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | File | 是 | Markdown 文件本体；文件名需以 `.md` 或 `.markdown`（大小写不敏感）结尾 |
| `parentId` | string | 否 | 父目录 ID（Base58）；省略或空字符串表示创建于根目录 |

**服务端校验顺序**（与 [research.md](./research.md) 第 3、5、6 节一致）：

1. 鉴权（`requireConsoleAuth`）—— 未登录返回 `401`
2. `file` 是否存在、文件名后缀是否合法 —— 不合法返回 `400`
3. `file.size` 是否超过 `MAX_FILE_SIZE_BYTES`（2MB，来自 [`src/lib/noteUploadLimits.ts`](../../../src/lib/noteUploadLimits.ts)）—— 超过返回 `413`
4. `resolveOwnedDirectory(db, userId, parentId)` —— 父目录不存在或不属于当前用户返回 `404`
5. `assertUniqueNameInParent(db, userId, parentId, title)`（`title` 为文件名去除扩展名）—— 同层重名返回 `409`

**Responses**:

- `201 Created`

  ```json
  { "id": "8fqNEmCdc6ZFomke37Vz", "title": "会议纪要", "parentId": null }
  ```

- `400 Bad Request` — 缺少 `file` 字段，或文件名不以 `.md`/`.markdown` 结尾

  ```json
  { "error": "invalid_file" }
  ```

- `401 Unauthorized` — 未登录 / 会话失效（沿用 `requireConsoleAuth`）
- `404 Not Found` — `parentId` 指定的目录不存在，或不属于当前用户

  ```json
  { "error": "parent_not_found" }
  ```

- `409 Conflict` — 同一父级下已存在同名的笔记或目录（对应 spec FR-017）

  ```json
  { "error": "name_conflict", "message": "同一目录下已存在同名的目录或笔记" }
  ```

- `413 Payload Too Large` — 文件大小超过 2MB（对应 spec FR-014）

  ```json
  { "error": "file_too_large" }
  ```

**幂等性**：本端点不做幂等设计——同一文件重复调用会因 `title` 已存在而在第二次触发 `409`，与手动创建笔记表单的行为一致，不属于本特性需要额外处理的场景。

**与现有端点的关系**：本端点是新增的、专用于"文件 → 新笔记"批量创建场景的写入路径；不复用 `POST /api/console/upload`（该端点用于向*已存在*的笔记添加二进制附件，语义与存储目标均不同，详见 [research.md](./research.md) 第 3 节）。笔记创建后的编辑、发布、频道关联、附件上传等操作均沿用既有的 `/{lang}/console/notes/[noteId]` 页面与相关 API，不在本端点范围内。
