# API Contract: 目录创建与树形子级加载

范围：内部 Console API（复用现有 `requireConsoleAuth` 鉴权与按 `userId` 隔离的模型），供 `/[lang]/console/notes` 页面的客户端交互调用。

## POST /api/console/notes/directories

创建一个目录条目。

**Request Body** (JSON):

```json
{
  "title": "工作笔记",
  "description": "",
  "parentId": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 是 | 目录名称，去除首尾空白后不能为空 |
| `description` | string | 否 | 目录描述，映射到 `notes.body`，缺省为空字符串 |
| `parentId` | string \| null | 否 | 父目录 ID（Base58），缺省或 `null` 表示创建于根目录 |

**Responses**:

- `201 Created`

  ```json
  { "id": "Cdc6ZFomke37Vz84fqNEm", "title": "工作笔记", "mimeType": "directory", "parentId": null }
  ```

- `400 Bad Request` — `title` 为空、`parentId` 指向的记录不是目录、或请求体格式错误
- `401 Unauthorized` — 未登录 / 会话失效（沿用 `requireConsoleAuth`）
- `404 Not Found` — `parentId` 指定的目录不存在，或不属于当前用户
- `409 Conflict` — 同一父级下已存在同名的目录或笔记（对应 spec FR-006/FR-007）

  ```json
  { "error": "name_conflict", "message": "同一目录下已存在同名的目录或笔记" }
  ```

## GET /api/console/notes/children?parentId=&lt;id|omit-for-root&gt;

按需获取某个目录的直接子级，用于树形表格展开交互（懒加载，参见 [research.md](./research.md) 第 3 节）。

**Query Params**:

| 参数 | 必填 | 说明 |
|---|---|---|
| `parentId` | 否 | 父目录 ID（Base58）；省略表示查询根目录下的直接子级 |

**Responses**:

- `200 OK`

  ```json
  [
    {
      "id": "8fqNEmCdc6ZFomke37Vz",
      "title": "周报",
      "mimeType": "directory",
      "hasChildren": false,
      "updatedAt": 1780000000000
    },
    {
      "id": "ke37Vz84fqNEmCdc6ZFo",
      "title": "会议纪要",
      "mimeType": "text/markdown",
      "hasChildren": false,
      "updatedAt": 1780000001000
    }
  ]
  ```

- `401 Unauthorized` — 未登录
- `404 Not Found` — `parentId` 指定的目录不存在，或不属于当前用户

**排序**：与现有 `/[lang]/console/notes` 列表一致，按 `updatedAt` 降序返回；目录与笔记混合排序，不做类型分组置顶（除非后续单独提出要求）。
