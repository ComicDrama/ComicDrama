# API 与跨服务契约

## API 响应

成功响应：

```json
{
  "data": {},
  "meta": { "traceId": "trace_xxx" }
}
```

错误响应：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请求参数无效",
  "traceId": "trace_xxx",
  "details": {}
}
```

## 当前端点

- `GET /api/health`：服务健康状态。
- `GET /api/version`：服务版本和能力列表。

## 任务契约

TypeScript 类型位于 `packages/contracts/src/task.ts`、`api.ts` 和 `provider.ts`。Python Worker 对应类型位于 `workers/src/common/protocol.py`。

## 日志与错误上报

API 和 Worker 每行输出一个 JSON 日志对象，字段约定如下：

- `timestamp`：UTC ISO-8601 时间。
- `level`：`INFO` 或 `ERROR`。
- `service`：服务名。
- `traceId`：请求或任务链路标识。
- `taskId`：可选的任务标识。
- `event`：稳定的事件名，例如 `http.request.completed`。
- `errorCode`：可选错误码。
- `message`：可选的人类可读信息。
- `metadata`：可选的结构化扩展字段。

API 会为每个请求生成或透传 `x-trace-id`，并在请求完成和异常时输出结构化日志。Worker 使用相同字段约定输出启动、停止及任务事件。完整任务重试、心跳和前端状态推送仍属于 P6 任务协议范围。

## 访问控制（P2-16）

受保护的项目接口使用 `ProjectAccessGuard`，通过 `@ProjectAccess(...)` 声明最低项目访问级别和可选业务角色。守卫从路由参数、查询参数或请求体读取 `projectId`，随后在服务端检查：

1. 用户是否为 `ACTIVE` 状态；
2. 用户是否具有 `ACTIVE` 的直接项目成员关系；
3. 用户是否通过 `ACTIVE` 的团队成员关系继承项目团队授权；
4. `VIEW`、`EDIT`、`MANAGE` 访问级别是否满足接口要求；
5. 指定业务角色是否存在于直接成员或团队角色分配中。

当前阶段使用 `x-user-id` 作为受信任身份适配层的输入。生产部署必须由已认证的 API 网关或后续身份认证中间件覆写此请求头，不能把客户端任意提交的用户 ID 当作身份凭据。

示例保护接口：

```text
GET /api/projects/:projectId/access-check
x-user-id: <active-user-uuid>
```

未认证返回 `401`，缺少项目范围或无权访问返回 `403`。项目授权决策不得由前端传入的 `projectId` 或访问级别直接决定。

## 审计记录（P2-17）

关键业务接口可以使用 `@AuditAction(...)` 声明审计动作，由全局 `AuditLogInterceptor` 在接口成功完成后追加写入 `AuditLog`。支持的动作包括：

- `IMPORT`：导入原文或外部数据；
- `GENERATE`：提交或执行生成任务；
- `UPDATE`：修改业务资源；
- `REVIEW`：提交审核、通过、驳回或要求修改；
- `LOCK`：锁定资源或版本；
- `EXPORT`：导出媒体或项目文件；
- `DELETE` / `ARCHIVE`：删除或归档资源。

示例：

```typescript
@AuditAction({
  action: 'EXPORT',
  entityType: 'RenderJob',
  entityIdParam: 'renderJobId',
  projectIdParam: 'projectId',
})
@Post(':projectId/render-jobs/:renderJobId/export')
export(projectId: string, renderJobId: string) {
  // 成功返回后自动写入 AuditLog。
}
```

每条记录至少保存动作、实体类型，并尽可能保存项目 ID、实体 ID、操作者 ID、操作者类型、`x-request-id`、`x-trace-id`/响应 traceId 和 HTTP 请求元数据。需要保存变更前后快照时，由业务服务调用 `AuditLogService.recordRequestAction` 显式传入 `before` 和 `after`；默认不自动记录请求体，避免把密码、令牌或 Provider 密钥写入审计日志。审计写入失败不会静默忽略，已声明审计的接口会返回失败，从而避免业务成功但审计缺失。

## 版本规则（P2-18）

版本快照只能通过 `VersioningService` 创建，不允许业务接口直接写入版本表。当前服务支持原文、剧本、镜头、资产、场景和时间线版本，并遵循以下规则：

1. 版本号按聚合根独立递增，从当前聚合根已有最大版本号加一；
2. 未指定父版本时，自动将当前最新版本作为父版本；显式父版本必须属于同一聚合根；
3. 新版本创建和聚合根的 `version`、`currentVersionId` 更新在同一个 Prisma transaction 内完成；
4. 已有下游引用的版本禁止原地修改；版本修订必须创建新版本；
5. 版本快照属于追加式事实，禁止删除；需要停用时应归档所属聚合根或通过新版本表达状态变化；
6. 当前已实现服务层规则。真实业务 API 接入后，还必须使用可运行的 PostgreSQL 执行数据库集成测试，覆盖并发版本创建、父版本归属、下游引用不可变性和事务回滚。

## 原文上传（P3-01）

原文上传端点：

```text
POST /api/projects/:projectId/source-documents/upload
Content-Type: multipart/form-data
x-user-id: <active-user-uuid>
```

请求必须包含名为 `file` 的文件字段，当前支持：

- `.txt`，对应 `TXT`；
- `.md`、`.markdown`，对应 `MARKDOWN`；
- `.docx`，对应 `DOCX`。

端点要求项目 `EDIT` 访问级别，单文件大小限制为 10 MiB。接口会校验扩展名/MIME 类型，计算 SHA-256，并将原始文件写入配置的 MinIO/S3-compatible 对象存储。当前返回对象存储暂存路径和文件元数据：

- `storageStatus`：`STORED`；
- `sha256`：文件内容的 SHA-256 十六进制摘要；
- `storageKey`：对象存储中的暂存路径；
- `byteSize`、`mimeType`：文件大小和 MIME 类型；
- `parserStatus`：`PENDING_PARSER`，表示正文尚未解析。

上传成功后会在同一业务流程中创建 `SourceDocument` 和首个 `SourceDocumentVersion`，并返回 `documentId`、`versionId` 和 `version`。版本记录导入时间、解析状态 `IMPORTING`、文件元数据和暂存对象路径；数据库登记失败时会尝试删除已上传对象，避免产生无法追溯的暂存文件。正文解析仍由后续 P3 任务完成。对象存储通过 `@aws-sdk/client-s3` 的 S3-compatible 接口访问，可连接本地 MinIO、AWS S3 或其他兼容服务。

## 原文解析（P3-04）

上传完成后，客户端可以请求解析指定的 TXT 或 Markdown 原文版本：

```text
POST /api/projects/:projectId/source-documents/:documentId/versions/:versionId/parse
x-user-id: <active-user-uuid>
```

端点要求项目 `EDIT` 访问级别，并在成功完成后写入 `IMPORT` 类型的 `AuditLog`。解析服务从版本记录的 `storageKey` 读取原始对象，不修改原始对象内容；DOCX 版本仍可上传并保存，但 P3-04 会返回不支持解析的错误，DOCX Parser 留给后续任务。

TXT 和 Markdown 的解析结果写入 `SourceDocumentVersion.textContent` 和 `SourceSegment` 来源树：

- 每个版本创建一个 `DOCUMENT` 根节点；Markdown ATX 标题创建 `CHAPTER` 或 `SECTION` 节点，普通连续非空文本创建 `PARAGRAPH` 节点；
- 标题包含“第…章”“第…集”或以 `Chapter`/`Episode` 开头时识别为 `CHAPTER`，其他 Markdown 标题识别为 `SECTION`；
- `parentId` 按标题层级和段落所属标题建立树关系，`ordinal` 从 `0` 开始并在版本内唯一；
- `startOffset`/`endOffset` 使用 JavaScript UTF-16 code unit 计数，区间为半开区间 `[startOffset, endOffset)`；
- `startLine`/`endLine` 使用从 `1` 开始的行号；`CRLF` 和孤立 `CR` 在解析前统一为 `LF`，全文缓存保存规范化后的文本；
- fenced code block 内的 `#` 不作为标题解析，列表和 Markdown 表格按连续文本段落保留。

成功响应示例：

```json
{
  "data": {
    "documentId": "document-uuid",
    "versionId": "version-uuid",
    "version": 1,
    "status": "READY",
    "parserName": "builtin-text-markdown",
    "parserVersion": "1.0.0",
    "textLength": 1280,
    "segmentCount": 12,
    "segmentsByType": {
      "DOCUMENT": 1,
      "CHAPTER": 3,
      "SECTION": 2,
      "PARAGRAPH": 6
    }
  },
  "meta": { "projectId": "project-uuid" }
}
```

解析状态流转为 `IMPORTING` → `PARSING` → `READY`，失败时为 `FAILED` 并保存 `errorMessage`。重复调用是可重入的：服务会先删除该版本旧的 `SourceSegment`，清空旧解析缓存，再重新读取原始对象并创建同一版本的新解析结果。P3-05 将补充原文预览、章节选择和段落定位查询 API。

## 原文读取与定位（P3-05）

原文解析完成后，客户端使用项目 `VIEW` 权限读取规范化正文和来源树：

```text
GET /api/projects/:projectId/source-documents/:documentId/versions/:versionId/preview
  ?segmentId=<segment-uuid>
GET /api/projects/:projectId/source-documents/:documentId/versions/:versionId/preview
  ?startOffset=0&endOffset=2000
GET /api/projects/:projectId/source-documents/:documentId/versions/:versionId/segments
  ?type=CHAPTER&parentId=<segment-uuid>&offset=512
GET /api/projects/:projectId/source-documents/:documentId/versions/:versionId/segments/:segmentId
x-user-id: <active-user-uuid>
```

约束：

- 所有端点都会校验 `projectId`、`documentId`、`versionId` 的归属关系；仅 `READY` 版本可读取；
- `preview` 默认从 `startOffset=0` 返回最多 2,000 个 UTF-16 code unit，单次范围不能超过 10,000；`segmentId` 与偏移范围不能同时使用；
- `startOffset`/`endOffset` 是规范化正文的 UTF-16 code unit 半开区间 `[startOffset, endOffset)`；
- `segments` 支持按 `type`、`parentId` 过滤；传入 `offset` 时返回包含该偏移位置的节点，并优先返回最小覆盖范围；
- `segments/:segmentId` 返回节点、父级祖先链和直接子节点，适合章节选择、段落定位和编辑器树形导航；
- 读取 API 不改变原始对象、版本事实或解析结果，也不会创建新的版本。

成功响应统一使用 `{ data, meta }`；来源节点包含 `id`、`type`、`ordinal`、`title`、`content`、`startOffset`、`endOffset`、`startLine`、`endLine` 和 `parentId`。
