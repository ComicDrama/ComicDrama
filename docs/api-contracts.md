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

解析状态流转为 `IMPORTING` → `PARSING` → `READY`，失败时为 `FAILED` 并保存 `errorMessage`。重复调用是可重入的：服务会先删除该版本旧的 `SourceSegment`，清空旧解析缓存，再重新读取原始对象并创建同一版本的新解析结果。P3-05 已提供原文预览、章节选择和段落定位查询 API。

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

## Parser 注册与格式支持（P3-06）

解析服务通过 `SourceDocumentParser` 接口和 `SourceDocumentParserRegistryService` 选择格式实现。每个注册项包含 Parser 名称、版本、支持的 `SourceDocumentType`、实现状态和后续任务说明。

当前已实现：

- `TXT`、`MARKDOWN`：`builtin-text-markdown@1.1.0`，沿用 P3-04 的章节、段落和 UTF-16 偏移量解析。

已登记但暂未实现，当前不会把二进制内容误当作 UTF-8 文本解析：

- `DOCX`：提取段落、标题、列表和文档属性；
- `EPUB`：读取 spine、XHTML 内容和章节顺序；
- `PDF`：提取页面文本、页码和段落位置，并预留 OCR 扩展点；
- `FOUNTAIN`：识别场景标题、动作、角色、对白和转场；
- `FINAL_DRAFT_XML`：读取 FDX 段落类型、样式和脚本元素层级。

对尚未实现的格式调用解析端点时，接口返回 `400 Bad Request`，响应错误中包含对应的 P3-06 待实现任务；原始文件仍可按 P3-01～P3-03 的流程保存到对象存储并登记版本事实。

## 文档清洗、分段与可重入任务（P3-07）

P3-07 在不修改对象存储原始文件的前提下，对 TXT/Markdown 内容执行确定性清洗和来源树分段：

- 删除正文开头的 UTF-8 BOM（`U+FEFF`）；
- 将 CRLF 和孤立 CR 统一为 LF；
- 保留非空文本中的空格和空白行，空白行只作为段落边界，不生成空段；
- Markdown ATX 标题继续按层级生成 `CHAPTER` 或 `SECTION`，连续非空文本生成 `PARAGRAPH`；
- `SourceDocumentVersion.textContent` 保存清洗后的正文，所有 `SourceSegment` 偏移量均对应清洗后文本的 UTF-16 code unit 半开区间；
- 根节点和分段 metadata 记录 `offsetUnit`、`offsetRange`、`lineBase` 及清洗策略，当前 Parser 版本为 `builtin-text-markdown@1.1.0`。

分段任务使用现有 `Task`/`TaskAttempt` 事实源，不重复增加任务表：

```text
POST /api/projects/:projectId/source-documents/:documentId/versions/:versionId/segment
x-user-id: <active-user-uuid>
x-trace-id: <optional-trace-id>

GET /api/projects/:projectId/source-document-tasks/:taskId
x-user-id: <active-user-uuid>

POST /api/projects/:projectId/source-document-tasks/:taskId/retry
x-user-id: <active-user-uuid>
x-trace-id: <optional-trace-id>
```

约束和幂等规则：

- 分段任务的稳定幂等键为 `SOURCE_DOCUMENT_SEGMENTATION:<versionId>`，由 `Task.idempotencyKey` 唯一约束保证同一版本不会重复创建任务；
- 首次请求创建 `PENDING` 任务并执行一次，成功后为 `SUCCEEDED`，任务结果保存解析摘要和分段计数；
- 同一版本重复请求复用既有任务：成功任务直接返回，运行中任务不重复执行，失败任务需通过 retry 端点按 `maxAttempts` 和最近一次 `TaskAttempt.retryable` 决定是否重试；
- 每次实际执行创建一个 `TaskAttempt`，失败时同时写入任务和尝试记录的错误码、错误信息及重试状态；
- 创建/重试接口需要项目 `EDIT` 权限，查询接口需要 `VIEW` 权限，接口成功完成后写入 `IMPORT` 类型 `AuditLog`；
- 当前执行器在 API 内同步完成解析，后续接入 P6 Worker/Streams 时可复用同一 `Task`、`TaskAttempt` 和幂等键协议。

## 分章实体提取（P3-08）

P3-08 在已经处于 `READY` 状态的原文版本上，以一个 `CHAPTER` 来源节点为边界生成章节内候选实体。当前实现使用确定性规则提取器 `builtin-rule-chapter-entity-extractor@1.0.0`，输出类型为 `CHARACTER`、`LOCATION`、`PROP`、`ORGANIZATION`、`TIME` 和 `EVENT`。这不是 LLM 判断或人工确认；置信度表达规则匹配强度，后续 P3-09/P3-10 才会进行跨章节归一化、人物关系、时间线和关键事件结构化。

```text
POST /api/projects/:projectId/source-documents/:documentId/versions/:versionId/chapters/:chapterSegmentId/entity-extractions
GET  /api/projects/:projectId/source-documents/:documentId/versions/:versionId/chapters/:chapterSegmentId/entity-extractions
GET  /api/projects/:projectId/chapter-entity-extraction-tasks/:taskId
POST /api/projects/:projectId/chapter-entity-extraction-tasks/:taskId/retry
x-user-id: <active-user-uuid>
```

触发和重试需要项目 `EDIT` 权限并写入 `GENERATE` 类型的 `AuditLog`；读取结果或任务需要 `VIEW` 权限。服务端同时验证项目、文档、版本和章节的归属，拒绝非 `READY` 版本、非 `CHAPTER` 节点以及任何跨项目/跨版本的 `chapterSegmentId`。

任务类型为 `CHAPTER_ENTITY_EXTRACTION`。同一 `sourceVersionId`、`chapterSegmentId`、提取器名称和版本共享稳定幂等键；重复提交复用既有 `Task`，运行中不会重新执行。失败任务可通过 retry 端点显式重试，尝试次数和状态保存在既有 `Task` / `TaskAttempt` 事实源。

结果保存在 `ChapterEntityExtraction`、`ExtractedEntity` 和 `ExtractedEntityMention`：每个 mention 保存来源 `SourceSegment`、原文证据、清洗后正文中的 UTF-16 半开偏移 `[startOffset, endOffset)`、行号、规则证据和置信度。重跑相同提取器版本时会事务性重建其候选实体和 mentions，不修改对象存储原文、`SourceDocumentVersion.textContent`、来源树，也不会写入 `Character` / `Location` / `Prop` 主数据。

`GET .../entity-extractions` 返回章节范围、提取器名称/版本、状态、按类型统计、章节内实体及每个实体的来源证据。若尚未触发该章节的提取，返回 `404`；客户端应先调用 POST 并根据任务状态轮询。

## 跨章节实体归并与别名归一化（P3-09）

P3-09 在同一不可变 `SourceDocumentVersion` 范围内读取所有成功的 `CHAPTER_ENTITY_EXTRACTION` 结果，建立独立的候选归并层；不会改写 `ExtractedEntity`、`ExtractedEntityMention`、原文或来源树，也不会直接写入 `Character`、`Location`、`Prop` 主数据。

```text
POST /api/projects/:projectId/source-documents/:documentId/versions/:versionId/entity-resolution
GET  /api/projects/:projectId/source-documents/:documentId/versions/:versionId/entity-resolution
GET  /api/projects/:projectId/cross-chapter-entity-resolution-tasks/:taskId
POST /api/projects/:projectId/cross-chapter-entity-resolution-tasks/:taskId/retry
x-user-id: <active-user-uuid>
```

创建和重试需要项目 `EDIT` 权限并写入 `GENERATE` 类型的 `AuditLog`；读取归并结果或任务需要 `VIEW` 权限。服务端校验项目、文档和版本的归属及 `READY` 状态，并且要求该版本至少具有一份成功的分章实体提取结果。任务类型为 `CROSS_CHAPTER_ENTITY_RESOLUTION`，稳定幂等键为 `CROSS_CHAPTER_ENTITY_RESOLUTION:<versionId>:<normalizerVersion>`；重复提交复用既有 `Task`，失败时按既有 `TaskAttempt`、最大次数和 retryable 标志显式重试。

当前归并器为 `builtin-surface-entity-normalizer@1.0.0`。它只应用可解释的确定性规则：Unicode NFKC、大小写/空白/标点表面归一化，时钟时间（例如 `23:47` 与“晚上十一点四十七分”）归一化，以及明确角色称谓（例如“许阿姨”与“许姨”）归一化。不能确定的语义别名不会自动合并。`GET .../entity-resolution` 返回规范实体、原始别名、出现次数、成员候选、章节来源、归并方法与置信度。

## 叙事结构候选（P3-10）

P3-10 在同一个不可变 `SourceDocumentVersion` 中，仅使用已成功的 P3-09 `SourceVersionEntityResolution`（固定为 `builtin-surface-entity-normalizer@1.0.0` 输出）生成可追溯的关系、事件和时间线候选；不会改写 P3-08/P3-09 结果、原文或来源树，也不会写入 `Character`、`Location`、`Prop` 主数据。

```text
POST /api/projects/:projectId/source-documents/:documentId/versions/:versionId/narrative-structure
GET  /api/projects/:projectId/source-documents/:documentId/versions/:versionId/narrative-structure
GET  /api/projects/:projectId/narrative-structure-tasks/:taskId
POST /api/projects/:projectId/narrative-structure-tasks/:taskId/retry
x-user-id: <active-user-uuid>
```

触发和重试需要项目 `EDIT` 权限并写入 `GENERATE` 类型 `AuditLog`；读取结构结果或任务需要 `VIEW` 权限。服务端验证项目、文档、版本归属和 `READY` 状态，并要求相同原文版本已有成功的 P3-09 归并结果。任务类型为 `SOURCE_VERSION_NARRATIVE_STRUCTURE`，稳定幂等键为 `SOURCE_VERSION_NARRATIVE_STRUCTURE:<versionId>:<analyzerVersion>`；重复提交复用任务，失败任务遵循既有 `TaskAttempt`、最大次数和 retryable 标志显式重试。

当前分析器为 `builtin-chapter-cooccurrence-narrative-analyzer@1.0.0`。`GET .../narrative-structure` 返回分析状态、关系、章节证据、出现次数及按 `chapterOrdinal`、`sourceOrdinal`、标题稳定排序的事件时间线；事件同时附带同章时间/地点锚点和 `MENTIONED_IN_EVENT_CHAPTER` 人物参与者。当前唯一关系类型 `CO_OCCURRENCE` 仅代表两个人物候选在同一章节中出现，**不**是亲属、恋爱、敌对、协作等语义关系；事件锚点、参与者和排序也不代表因果、真实时序、LLM 或人工确认。

## 世界观与业务主数据初稿（P3-11）

```text
POST /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts
GET  /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts
x-user-id: <active-user-uuid>
```

创建需要项目 `EDIT` 权限并写入 `GENERATE` 类型的 `AuditLog`；读取需要 `VIEW` 权限。服务端验证项目、文档、版本归属、原文版本 `READY`，且该版本的 `builtin-surface-entity-normalizer@1.0.0` 归并结果已成功。

生成器 `builtin-cited-source-draft-generator@1.0.0` 按版本与生成器版本幂等生成 `WORLD`、`CHARACTER`、`LOCATION`、`PROP` 初稿，保存于 `SourceDraftGeneration`、`SourceDraftEntity` 和 `SourceDraftCitation`。引用指向原文 `SourceSegment`、P3-09 规范成员及 mention 的精确文本、UTF-16 半开偏移、行号和置信度。

生成是可重复的确定性候选，不是 LLM 结论或人工定稿；无法从来源证明的内容不推断，字段保持空值并列入 `openQuestions`。世界观初稿仅索引来源中已有的组织、时间、事件候选；不修改 P3-08～P3-10 事实源，不 upsert 正式 `Character`、`Location`、`Prop`。

## 结构化校验与人工修正（P3-12）

```text
POST  /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts/validate
PATCH /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts/:draftEntityId
x-user-id: <active-user-uuid>
```

P3-12 使用版本化 JSON Schema `1.0.0` 校验四类初稿的名称、必填字段、字段类型和未知字段。`GET source-drafts` 返回 `schema.version`、按 `kind` 的数量以及 `pendingCount`、`needsReviewCount`、`validatedCount`、`correctedCount`。每个 `SourceDraftEntity` 返回 `validationStatus`、`validationErrors`、`reviewedAt` 和 `reviewedBy`。

批量校验需要项目 `EDIT` 权限并写入 `REVIEW` 审计日志；单项修正需要项目 `EDIT` 权限，Body 可包含 `name`、`content` 至少一个字段。服务端保存修正后重新校验：有错误标记为 `NEEDS_REVIEW`，通过校验标记为 `CORRECTED`，并记录审核人和时间；修正请求写入 `UPDATE` 审计日志。引用和 P3-08～P3-11 原始事实均保持只读。

## P3-13 初稿来源查看

读取单个结构化初稿实体对应的原文引用、段落定位和上下文：

```text
GET /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts/:draftEntityId/sources
```

权限要求为项目 `VIEW`。可选查询参数 `contextBefore`、`contextAfter` 均为非负整数，默认 `160`，最大 `2000`；偏移量使用原文版本 `textContent` 的 UTF-16 code unit 坐标。

返回的每条来源包含：

- `quote`：生成时保存的引用；
- `actualQuote`：按版本全文 offset 从当前原文切出的文本；
- `quoteMatch`：`MATCH`、`MISMATCH` 或 `OUT_OF_RANGE`；
- `sourceSegment`：来源段落及其全文坐标；
- `context`：裁剪后的原文上下文和坐标。

`MISMATCH` 和 `OUT_OF_RANGE` 是可审阅的来源异常，接口仍返回 HTTP 200，不会静默修改原始引用。
