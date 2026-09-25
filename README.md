# AI漫剧创作平台

本仓库按 [`AI漫剧创作平台实施计划.md`](AI漫剧创作平台实施计划.md) 分阶段建设，目标是形成一条可版本化、可审核、可回退、可批量生产的漫剧生产链路：

> IP 内容库 → 剧本工程 → 分镜工程 → 数字资产库 → 镜头生产线 → 音频生产线 → 多轨剪辑工程 → 渲染交付

## 当前状态

- V1 固定测试样本：`V1测试样本_雨夜的灯.md`
- 架构说明：`AI漫剧平台架构说明书v1.1.md`
- 实施计划：`AI漫剧创作平台实施计划.md`
- 已实现：`P0-01`～`P0-09`、`P1-01`～`P1-13`、`P2-01`～`P2-18`、`P3-01`～`P3-12`；截至 2026-09-25，P2-13～P2-18、P3-01～P3-12 已完成本地 Docker PostgreSQL/MinIO/API 真实链路和专项故障注入验证。P3-12 已完成迁移部署、Schema 校验、批量复核、非法/合法修正、权限和审计回归。
- 当前阶段：P3 原文导入与内容理解；P2-18 事务回滚、P2-17 新建任务审计 entityId 回填、P3-03 对象清理、P3-07 重解析外键边界和 P3-12 Docker/API 回归均已完成，下一项为 `P3-13`（实现“原文 → 提取结果”的差异/来源查看）
- CI：GitHub Actions 已配置 Node.js 22、Python 3.13、Prisma、Prettier、ESLint、Ruff、Pytest、类型检查和构建检查

## 环境要求

- Node.js 22
- npm（必须使用已提交的根目录 `package-lock.json`）
- Python 3.13
- `uv`
- Docker Desktop（已验证 `docker` 和 `docker compose` 可用）
- GitHub CLI（用于检查 GitHub Actions）

### Python Worker 虚拟环境

Worker 使用 `uv` 创建的 Python 3.13 虚拟环境。运行 Worker 检查或本地 Worker 命令前，先激活环境并确认版本：

```powershell
cd workers
.venv\Scripts\activate
python --version
cd ..
```

PowerShell 也可以使用 `.\.venv\Scripts\Activate.ps1`。不要依赖系统默认 Python 版本。

## 安装依赖

```powershell
npm ci
cd workers
uv sync
.venv\Scripts\activate
python --version
cd ..
```

## 常用检查命令

在仓库根目录执行：

```powershell
npm run prisma:format --workspace api
$env:DATABASE_URL="postgresql://comicdrama:change-me@localhost:5432/comicdrama?schema=public"
npm run prisma:validate --workspace api
npm run prisma:generate --workspace api
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build --workspace web
npm run build --workspace api

cd workers
.venv\Scripts\activate
ruff check src tests
pytest tests
python -m compileall -q src
cd ..
git diff --check
```

## 本地基础设施

启动 Docker Compose 服务：

```powershell
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up --build -d
docker compose -f infra/docker-compose.yml ps
```

停止服务：

```powershell
docker compose -f infra/docker-compose.yml down
```

服务包括 PostgreSQL、Redis、MinIO、API、Web、Python Worker 和 Nginx。数据库迁移部署与状态检查：

```powershell
$env:DATABASE_URL="postgresql://comicdrama:change-me@localhost:5432/comicdrama?schema=public"
.\node_modules\.bin\prisma.cmd migrate deploy --schema api/prisma/schema.prisma
.\node_modules\.bin\prisma.cmd migrate status --schema api/prisma/schema.prisma
```

## GitHub Actions

`.github/workflows/ci.yml` 会在 push 和 pull request 时执行静态检查、Prisma Schema 校验、前后端构建以及 Worker 的 Ruff、Pytest 和 Python 编译检查。提交代码前建议先在本地执行与 CI 等价的命令；CI 失败时可使用：

```powershell
gh run list --repo ComicDrama/ComicDrama --limit 5
gh run view <run-id> --repo ComicDrama/ComicDrama --log-failed
```

## 目录结构

```text
web/                 Vue 3 + Vite 创作工作台
api/                 NestJS 控制平面与 Prisma Schema/迁移
workers/             Python 3.13 Worker、测试和 Dockerfile
packages/contracts/  跨服务 TypeScript 契约
infra/               Docker Compose、Nginx、Redis、MinIO 配置
tests/               仓库级测试
docs/                API 契约、本地开发和基础设施说明
```

## 数据模型进度

P2 已按实施计划逐步建立 PostgreSQL 事实源：

- P2-01～P2-04：项目层级、原文、剧本和分镜事实源
- P2-05～P2-07：资产、角色/场景/道具和生成 Provider 事实源
- P2-08：工作流与任务事实源
- P2-09：Timeline、TimelineVersion、Track、Clip、Transition、Keyframe
- P2-10：Review、ReviewComment、Approval、RenderJob、RenderSegment、ExportPreset
- P2-11：UsageRecord、CostRecord、AuditLog
- P2-12：核心表项目归属、可变记录时间戳、聚合根乐观版本号、归档策略和项目查询索引
- P2-13：迁移执行、可重复种子数据、失败处理与补偿迁移/回滚操作说明
- P2-14：User、Team、TeamMember、ProjectMember、ProjectTeam 与通用项目访问级别
- P2-15：首版业务角色与项目成员/团队角色分配
- P2-16：API 级权限守卫、项目资源级访问检查和业务角色访问级别校验
- P2-17：关键导入、生成、修改、审核、锁定、导出、删除/归档操作的 AuditLog 自动记录
- P2-18：版本创建、父版本链、当前版本指针和下游引用后的不可变规则（含事务失败回滚故障注入验证）

P3 原文导入进度：

- P3-01：TXT、DOCX 和 Markdown multipart 上传接收、类型校验、10 MiB 大小限制和项目 EDIT 权限保护（已完成真实上传验证）
- P3-02：SHA-256 文件哈希、S3-compatible 对象存储上传和 storageKey 元数据返回（已完成 MinIO 写入/读取验证）
- P3-03：上传后创建 SourceDocument 和不可变 SourceDocumentVersion，记录导入时间、解析状态和文件元数据（含数据库失败后的 MinIO 对象清理验证）
- P3-04：TXT/Markdown 章节、段落、字符偏移量、行号和来源树解析（已完成真实解析验证）
- P3-05：原文预览、章节选择、段落定位和来源树查询 API（已完成）
- P3-06：统一 Parser 接口、TXT/Markdown 注册和 DOCX/EPUB/PDF/Fountain/Final Draft XML 待实现任务登记（已完成）
- P3-07：正文清洗、章节/段落来源树与 `SOURCE_DOCUMENT_SEGMENTATION` 可重入任务（已完成真实幂等验证；重解析时会先清理 P3-08～P3-11 派生结果和旧任务，再删除旧分段，避免 `sourceSegment` 外键阻塞）
- P3-08：按 `CHAPTER` 提取角色、地点、道具、组织、时间与事件候选；保存实体、证据段落、UTF-16 偏移和行号，支持可重入任务与显式重试（已完成）
- P3-09：在单一不可变 `SourceDocumentVersion` 内合并已成功的分章候选；以可解释的表面形式、时间时钟和明确称谓规则生成规范实体与别名，并保留全部原始候选来源（已完成）
- P3-10：在已成功的 P3-09 规范实体上生成同章共现人物关系候选、事件候选及按章节/来源顺序排列的时间线；保留章节证据、时间/地点锚点和同章人物参与者（已完成）
- P3-11：以 P3-09 成功归并结果确定性生成世界观、角色、地点/场景和道具初稿；字段关联段落原文引用，不确定字段保持空值/待确认，不覆盖正式主数据（已完成真实链路验证）
- P3-12：为 `SourceDraftEntity` 增加版本化 JSON Schema 校验、错误路径/消息持久化、批量复核和单项人工修正入口；修正后重新校验并保留审核人/时间（已完成实现，待 Docker 环境执行真实 API 回归）

重解析边界验证（2026-09-25）：使用旧种子数据真实重试分段接口，清理 ExtractedEntityMention、SourceDraftCitation 等 SourceSegment 依赖后，任务从 RETRYING 成功进入 SUCCEEDED；重新生成 84 个分段（3 章、14 节、66 段落），并对新第一章完成 P3-08 实体提取（31 个实体、46 条 mention）。

P3-08 当前使用 `builtin-rule-chapter-entity-extractor@1.0.0`，是可重复运行的规则提取器，不等同于 LLM 或人工确认。结果仅是章节内候选事实，不会直接写入 `Character`、`Location`、`Prop` 主数据；P3-09 已完成真实跨章节候选归并；P3-10 已完成真实同章共现关系、事件候选和来源顺序时间线；P3-11 已完成真实可追溯初稿生成；P3-12 已补充结构化校验状态和人工修正入口。两阶段都不会推断亲属、敌对、因果或其他语义事实。

详细字段、迁移约束和后续业务校验见 [`api/prisma/README.md`](api/prisma/README.md)；迁移执行、种子数据与回滚流程见 [`docs/database-migrations.md`](docs/database-migrations.md)。

## P3-09 跨章节实体归并

P3-09 基于同一不可变 `SourceDocumentVersion` 中所有成功的 P3-08 分章结果，创建独立的 `CanonicalEntity`、`CanonicalEntityAlias` 与 `CanonicalEntityMember` 事实层。归并器 `builtin-surface-entity-normalizer@1.0.0` 仅执行确定性且可解释的 Unicode/空白/标点表面归一化、`23:47` 与“晚上十一点四十七分”这类时钟时间归一化，以及“许阿姨”与“许姨”这类明确称谓规则。

原始 `ExtractedEntity`、mention、章节和段落证据不会被改写；每个规范实体保留成员、原始别名、出现次数、归并方法和置信度。无法由上述规则确定的语义别名会保持为不同候选，系统不会将“白裙女人”自动断言为“小满的妈妈”。结果也不会直接写入 `Character`、`Location` 或 `Prop` 主数据：P3-10 处理关系/事件/时间线，P3-11 已生成独立的可追溯业务初稿层，不直接写入正式主数据。

## P3-10 叙事结构候选

P3-10 仅在一个不可变 `SourceDocumentVersion` 内，读取已成功的 P3-09 归并结果，创建 `NarrativeStructure`、`NarrativeRelationshipCandidate`、`NarrativeRelationshipEvidence`、`NarrativeEventCandidate` 与 `NarrativeEventParticipant`。分析器为 `builtin-chapter-cooccurrence-narrative-analyzer@1.0.0`，任务类型为 `SOURCE_VERSION_NARRATIVE_STRUCTURE`，以稳定幂等键和既有 `Task`/`TaskAttempt` 状态机支持重复提交和显式重试。

当前关系类型唯一为 `CO_OCCURRENCE`，只表示两个人物候选同章出现，并通过章节证据和出现次数回溯；它**不**代表亲属、恋爱、敌对、协作或任何已确认的人物关系。每个 `EVENT` 来源成员形成一个关键事件候选；同章 `TIME`、`LOCATION` 仅作为锚点，同章人物仅以 `MENTIONED_IN_EVENT_CHAPTER` 参与者记录。时间线按原文 `chapterOrdinal`、来源 `sourceOrdinal` 和标题稳定排序，不表述事件因果、真实时间先后或人工/LLM 判断。

P3-10 事务性重建自身候选，不改写 P3-08 原始实体/mention、P3-09 规范实体/别名、对象存储原文或 `Character`、`Location`、`Prop` 主数据。P3-11 已将候选转为独立的可追溯世界观与业务主数据初稿；P3-12 已提供结构化校验和人工修正入口。

## P3-11 可追溯初稿

P3-11 使用 `builtin-cited-source-draft-generator@1.0.0`，根据 READY 原文版本的成功 P3-09 归并结果生成版本级 `SourceDraftGeneration` 和 `SourceDraftEntity`，并以 `SourceDraftCitation` 保存原文段落、精确 mention 文本、UTF-16 偏移、行号、规范实体成员和置信度。类型包括世界观容器、角色、地点/场景与道具。世界观容器附带原文已提取的组织、时间、事件候选索引；没有来源支持的设定、性格、背景、外貌、空间细节和道具材质等保持空值并列入待确认问题。

接口为 `POST/GET /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts`。重复生成复用同版本、同生成器版本的批次并事务性重建草稿与引用。该结果是确定性候选而非 LLM 或人工定稿，不修改 P3-08～P3-10 事实源，不写入 `Character`、`Location`、`Prop` 正式主数据；P3-12 负责后续校验和人工修正。

## P3-12 结构化校验与人工修正

P3-12 为 `WORLD`、`CHARACTER`、`LOCATION`、`PROP` 四类初稿定义版本化 JSON Schema（当前版本 `1.0.0`），校验名称、必填字段、字段类型和未知字段。校验结果写入 `SourceDraftEntity.validationStatus` 与 `validationErrors`，状态包括 `PENDING`、`NEEDS_REVIEW`、`VALIDATED`、`CORRECTED`。`GET source-drafts` 返回 Schema 版本、各类型数量和各校验状态汇总。

接口：

```text
POST  /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts/validate
PATCH /api/projects/:projectId/source-documents/:documentId/versions/:versionId/source-drafts/:draftEntityId
x-user-id: <active-user-uuid>
```

批量复核需要项目 `EDIT` 权限并记录 `REVIEW` 审计日志；人工修正支持更新 `name` 或 `content`，服务端重新执行 Schema 校验，写入错误路径/消息并记录 `reviewedAt`、`reviewedBy`，修正请求写入 `UPDATE` 审计日志。来源引用仍只读，P3-08～P3-11 事实源和正式主数据不被覆盖。

### P3-13 来源查看

已提供只读接口，将结构化初稿实体追溯到原文引用、来源段落和上下文，并返回 `MATCH`、`MISMATCH`、`OUT_OF_RANGE` 引用一致性状态。来源坐标基于原文版本全文的 UTF-16 code unit，支持 `contextBefore`/`contextAfter`（默认 160，最大 2000）。
