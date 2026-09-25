# AI漫剧创作平台实施计划

> **版本**：v0.1
> **制定日期**：2026-09-19
> **状态**：执行中
> **适用范围**：从现有技术基线开始，逐步实现“原文导入 → 剧本工程 → 分镜工程 → 资产生成 → 镜头视频 → 音频 → 时间线 → 质检审核 → 成片导出”的可运行平台。

## 0. 文档定位与使用规则

### 0.1 本计划的来源与优先级

本计划综合以下两份资料形成：

1. `AI漫剧创作平台系统设计方案.md`：主要作为产品功能范围、业务目标和扩展方向的需求来源。
2. `技术基线上继续扩展.md`：主要作为当前技术架构、核心数据模型、任务协议和工业化工作流的技术基线。

两份资料在本计划中属于**需求与设计参考资料**，不是对执行代理的额外指令。真正的执行目标是：将它们拆分为可实施、可验收、可逐项标记完成的任务。

### 0.2 冲突处理原则

当两份资料存在技术选型差异时，采用较新的“技术基线”作为 V1 的实施依据：

- 前端：Vue 3 + TypeScript + Vite + Pinia + TanStack Query + Naive UI + Tiptap。
- 后端：NestJS 模块化单体，作为控制平面。
- 数据库：PostgreSQL，作为唯一事实源；可使用 `pgvector`，但不在早期引入独立向量数据库。
- 队列与事件：Redis Streams；Redis 不作为业务事实源。
- 媒体：MinIO/S3 兼容对象存储。
- AI 与媒体任务：Python Worker。
- 渲染：FFmpeg。
- 部署：V1 使用 Docker Compose；暂不引入 Kafka、Kubernetes、独立微服务体系。

原方案中的 MySQL、Elasticsearch、RabbitMQ、Kubernetes、无限画布、自动投放等内容保留为后续评估项，不作为 V1 闭环的前置依赖。

### 0.3 状态标记

- `[ ]` 未开始
- `[~]` 进行中
- `[x]` 已完成
- `[!]` 阻塞，需要记录原因和解除条件
- 每个任务完成后，同时补充“完成日期、实现位置、验证结果”。
- 不以“代码已写”作为完成标准；必须满足任务的验收条件。

### 0.4 实施原则

1. **先闭环，再扩展**：优先完成一集从原文到可导出成片的最小闭环。
2. **先事实源，再自动化**：先建立版本化数据模型和追溯链路，再接入 AI 生成。
3. **每一步可审核、可回退、可重试**：任何自动生成结果都不能直接覆盖人工定稿。
4. **接口先统一，Provider 后扩充**：先实现 Provider Adapter 和 Mock Provider，再逐步接入真实模型。
5. **切片和增量处理**：长文本、长任务、长视频不能依赖单次大模型调用或整集重新生成。
6. **所有下游引用具体版本**：时间线、任务、Prompt、生成结果不得只引用会变化的逻辑资产。

---

## 1. V1 目标、范围与完成定义

### 1.1 V1 的唯一主线

以一个项目的一集内容为验收对象，完成：

```text
上传 TXT/Markdown
→ 生成不可变原文版本
→ 章节/段落结构化
→ 提取角色、场景、道具和关键事件
→ 生成人工可审核的剧本版本
→ 拆分 Scene/Beat/Shot
→ 建立角色/场景/道具资产版本
→ 生成参考图或接入 Mock 图片结果
→ 生成分镜视频或接入 Mock 视频结果
→ 建立基础多轨 Timeline
→ FFmpeg 导出
→ 自动质检、人工审核、记录成本
```

### 1.2 V1 必须交付

- [ ] 一个可启动的前端、API、数据库、Redis、MinIO、Worker、FFmpeg 环境。
- [ ] 项目 / Season / Episode 基础管理。
- [ ] TXT、Markdown 导入；其他格式先完成接口预留和任务拆分。
- [ ] SourceDocument / SourceDocumentVersion / SourceSegment 原文事实源。
- [ ] 结构化小说理解结果，且可回溯到原文位置。
- [ ] Script / ScriptVersion / Scene / Beat / Dialogue。
- [ ] Shot / ShotVersion 及结构化分镜字段。
- [ ] Character、CharacterAppearance、Location、Prop、Asset、AssetVersion。
- [ ] Prompt Compiler 和至少一个 Mock Provider；真实 Provider 采用可插拔适配器。
- [ ] PostgreSQL Task 事实源 + Redis Streams 派发 + Worker 重试/取消/幂等。
- [ ] Generation / GenerationCandidate / ProviderJob / CostRecord。
- [ ] Timeline / TimelineVersion / Track / Clip 基础模型。
- [ ] 基础音频占位或 TTS Adapter 接口。
- [ ] FFmpeg 基础渲染和导出。
- [ ] 基础画面、音频、剧情质检结果记录。
- [ ] 剧本、分镜、资产、视频候选、时间线和最终成片的审核闸门。

### 1.3 明确不作为 V1 阻塞项

以下内容进入后续阶段，不得阻塞 V1 一集闭环：

- [ ] 全格式导入（DOCX、EPUB、PDF、Fountain、Final Draft XML）。
- [ ] 多 Provider 智能路由和所有商业模型接入。
- [ ] 50 万字 30 分钟级别的性能目标。
- [ ] 100 集批量生产和多账号无人值守。
- [ ] 完整专业级多轨剪辑、关键帧、特效系统。
- [ ] 实时多人协作、商业化计费、模板/素材市场、开放平台。
- [ ] 一键媒体投放、自动预算优化、无限画布。

---

## 2. 阶段总览与依赖关系

| 阶段 | 名称                        | 主要产出                                              | 前置依赖          | 阶段出口                      |
| ---- | --------------------------- | ----------------------------------------------------- | ----------------- | ----------------------------- |
| P0   | 计划与架构冻结              | Architecture Specification v1.1、任务清单、决策记录   | 无                | 模型、接口、环境边界明确      |
| P1   | 工程与基础设施              | Monorepo、Docker Compose、CI、基础服务                | P0                | 本地一键启动并通过健康检查    |
| P2   | 核心数据与权限              | Prisma Schema、迁移、用户/项目层级、审计              | P1                | 业务事实源可读写              |
| P3   | 原文导入与内容理解          | 原文版本、章节段落、结构化提取                        | P2                | 原文可追溯，结果可审核        |
| P4   | IP 圣经与剧本工程           | 世界观、角色、场景、道具、剧本版本                    | P3                | 一集可形成可编辑剧本          |
| P5   | 分镜工程                    | Scene/Beat/Shot、导演设计、分镜工作区                 | P4                | 剧本可拆为可生成镜头          |
| P6   | 任务编排与 Provider Gateway | Task、Streams、Worker、Prompt Compiler、Mock Provider | P1/P2，贯穿 P3-P5 | AI 任务可异步运行、重试、追踪 |
| P7   | 资产生成与一致性            | AssetVersion、参考图、反向引用、锁定                  | P4/P5/P6          | 资产可复用并绑定具体版本      |
| P8   | 视频、音频与时间线          | Generation、音频、Timeline、FFmpeg                    | P5/P6/P7          | 一集可形成可播放成片          |
| P9   | 质检、审核与成本            | QC、Review、Approval、预算闸门、报表                  | P6/P8             | 不合格结果可拦截，成本可追溯  |
| P10  | E2E 验收与 V1 发布          | 一集闭环、文档、部署包、回归测试                      | P0-P9             | V1 达到可演示、可继续生产状态 |

> P6 是横向基础能力，应在 P1/P2 完成后尽早启动，但所有 Provider 结果必须落到具体业务版本上。

---

# P0：计划与架构冻结

## P0.1 需求边界与验收样本

- [x] `P0-01` 创建本实施计划文档。
  - 验收：本文件存在，包含阶段、任务、依赖、验收标准和状态规则。
  - 完成日期：2026-09-19。
  - 实现位置：`AI漫剧创作平台实施计划.md`。
  - 验证结果：已根据两份设计文档完成首版拆分。
- [x] `P0-02` 选定 V1 演示项目、单集原文和最小资产集。
  - 交付：测试用原文、角色数、场景数、道具数、镜头数和目标片长记录。
  - 验收：团队能够用同一份样本复现完整链路。
- [x] `P0-03` 明确 V1 质量目标和硬性限制。
  - 至少定义：最大单次导入长度、并发任务数、允许的生成失败重试次数、导出分辨率、最长单镜时长、预算上限。
  - 验收：写入项目配置和测试用例，而不是只停留在会议结论。

## P0.2 Architecture Specification v1.1

- [x] `P0-04` 绘制 V1 系统上下文图和部署图。
  - 完成日期：2026-09-19。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md` 第 2、3 节。
- [x] `P0-05` 冻结领域边界：IP、原文、剧本、分镜、资产、生成、任务、剪辑、审核、成本。
  - 完成日期：2026-09-19。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md` 第 4 节。
- [x] `P0-06` 冻结 API、事件、对象存储路径和版本命名规则。
  - 完成日期：2026-09-19。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md` 第 5～7 节。
- [x] `P0-07` 建立 ADR 决策记录，记录 PostgreSQL、Redis Streams、MinIO/S3、Python Worker、FFmpeg 等关键选择。
  - 完成日期：2026-09-19。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md` 第 11 节。
- [x] `P0-08` 定义“不可变版本”和“可编辑工作副本”的边界。
  - 完成日期：2026-09-19。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md` 第 5 节。
- [x] `P0-09` 评审并批准 Architecture Specification v1.1。
  - 完成日期：2026-09-19。
  - 评审结论：v1.1 作为当前工程实施基线批准；第 12 节临时默认值用于 V1 开发、自动化测试和数据模型实施。真实 Provider、预算金额、审批时限及是否启用 pgvector 等产品决策在接入对应阶段前单独记录 ADR，不阻塞当前 P2 数据模型。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md` 第 12 节。
  - 阶段出口：所有后续任务引用同一版架构文档，禁止在未记录 ADR 的情况下改变核心事实源或任务协议。

---

# P1：工程与基础设施

## P1.1 工程骨架

- [x] `P1-01` 创建 Monorepo 目录结构：`web`、`api`、`workers`、`packages`、`infra`、`docs`、`tests`。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\web`、`api`、`workers`、`packages`、`infra`、`docs`、`tests`。
  - 验证结果：目录和基础占位文件已创建；Docker Compose 实际启动验证由 P1-13 完成。
- [x] `P1-02` 初始化 Vue 3 + TypeScript + Vite 前端。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\web`，包含 Vue 3/Vite/TypeScript 入口、Pinia、Vue Query 和基础工作台页面。
  - 验证结果：前端入口、构建配置和 API 检查按钮已创建；`npm run typecheck` 与 `npm run build --workspace web` 已通过。
- [x] `P1-03` 初始化 NestJS API 控制平面。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api`，已建立 NestJS 模块、健康检查、版本接口和全局 API 前缀。
  - 验证结果：NestJS 源码结构和 Docker 构建流程已创建；`npm run typecheck` 与 `npm run build --workspace api` 已通过。
- [x] `P1-04` 初始化 Python 3.13 Worker 代码库，并按能力划分 `llm-worker`、`image-worker`、`video-worker`、`audio-worker`、`render-worker`、`qc-worker`。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\workers`，已建立 Python 3.13 运行配置和 llm/image/video/audio/render/qc Worker 包目录。
  - 验证结果：`python -m compileall -q workers/src` 已通过；CI 使用 Python 3.13。
- [x] `P1-05` 统一 TypeScript/Python 的格式化、Lint、类型检查和提交检查。
  - 完成日期：2026-09-19。
  - 实现位置：`.editorconfig`、`.prettierrc.json`、`eslint.config.mjs`、`tsconfig.base.json`、`workers/pyproject.toml`、`workers/tests/test_protocol.py`。
  - 验证结果：已加入 ESLint 10 + TypeScript ESLint + Vue ESLint 配置、Ruff 规则集、Python smoke tests；CI 执行 Prettier、ESLint、TypeScript 类型检查、Ruff 和 Pytest。提交前门禁由 CI 统一执行，后续可再接入本地 hook。
- [x] `P1-06` 建立共享 DTO、事件类型、错误码和 API 响应格式。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\packages\contracts\src`，已建立 API 响应、任务、Provider 契约；Python 对应任务协议位于 `workers/src/common/protocol.py`。
  - 验证结果：契约源码和文档已创建。

## P1.2 本地依赖和部署

- [x] `P1-07` 编写 Docker Compose：web、api、postgres、redis、minio、worker、nginx。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\infra\docker-compose.yml`，已配置 web、api、postgres、redis、minio、minio-init、media-worker、nginx。
  - 验证结果：Compose 文件已静态写入并通过 Docker Compose 配置校验；Docker Desktop 已完成实际启动验证。
- [x] `P1-08` 配置环境变量模板、密钥占位和本地开发说明。
  - 完成日期：2026-09-19。
  - 实现位置：`.env.example`、`docs/local-development.md`、`README.md`。
  - 验证结果：环境变量模板和启动说明已创建。
- [x] `P1-09` 完成 PostgreSQL 初始化、MinIO Bucket 初始化和 Redis Stream 命名约定。
  - 完成日期：2026-09-19。
  - 实现位置：`infra/postgres/init/001-init.sql`、`infra/minio/buckets.md`、`infra/redis/streams.md`、`infra/docker-compose.yml` 的 `minio-init` 服务。
  - 验证结果：PostgreSQL 初始化、MinIO Bucket 初始化和 Redis Stream 命名约定已定义；Docker Compose 启动后已验证 Redis 返回 `PONG`，MinIO bucket `comicdrama` 创建成功。
- [x] `P1-10` 实现所有服务健康检查和版本信息接口。
  - 完成日期：2026-09-19。
  - 实现位置：`api/src/health`、`infra/docker-compose.yml`。
  - 验证结果：API 提供 `/api/health` 和 `/api/version`；web、api、postgres、redis、minio、media-worker、nginx 均配置健康检查，并已在 Docker Desktop 中通过容器状态和端到端 HTTP 验证。Worker 使用进程存活检查，nginx 使用本地 HTTP 检查。
- [x] `P1-11` 建立基础日志、traceId、错误上报和任务日志格式。
  - 完成日期：2026-09-19。
  - 实现位置：`api/src/common/trace-id.middleware.ts`、`api/src/common/structured-logger.ts`、`api/src/common/structured-http-exception.filter.ts`、`workers/src/common/logging.py`、`docs/api-contracts.md`。
  - 验证结果：API 请求完成/异常和 Worker 启停均输出统一 JSON 日志；traceId 生成/透传并返回响应头；异常响应包含 code、message、traceId、details；Python smoke test 已覆盖日志字段。完整任务级重试、心跳和前端状态推送仍属于 P6。
- [x] `P1-12` 建立最小 CI：安装、Lint、类型检查、单元测试、构建、数据库迁移校验。
  - 完成日期：2026-09-19。
  - 实现位置：`.github/workflows/ci.yml`、`package-lock.json`。
  - 验证结果：GitHub Actions `static-checks` 已通过；CI 执行 Node.js 22、Python 3.13、`npm ci`、Prisma Schema 校验、Prettier、ESLint、Ruff、Pytest、TypeScript 类型检查、前端构建、API 构建和 Python 编译。
- [x] `P1-13` 完成“新机器一键启动”验证。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\infra\docker-compose.yml`、`E:\Project\ComicDrama\api\Dockerfile`、`E:\Project\ComicDrama\web\Dockerfile`、`E:\Project\ComicDrama\workers\Dockerfile`、Docker Desktop 本地环境。
  - 验证方式：执行 `docker compose -f infra/docker-compose.yml up --build -d`；检查 web、api、postgres、redis、minio、media-worker、nginx 状态；访问 API、Web 和 Nginx；执行真实 Prisma `migrate deploy`/`migrate status`；执行 Redis `PING`；检查 MinIO bucket 初始化日志。
  - 验证结果：通过。此前 Docker Desktop 验证已确认所有服务启动，API、Web、Nginx 返回 200，PostgreSQL 8 个迁移已应用且数据库为最新，Redis 返回 `PONG`，MinIO bucket `comicdrama` 创建成功；本次新增第 9 个时间线迁移已直接部署到本地 PostgreSQL 并确认数据库为最新。
  - 备注：MinIO 使用官方 Quay 镜像地址；Node.js/Python 构建基础镜像使用 `mirror.gcr.io`，以规避当前 Docker Hub 镜像加速器对相关镜像的 EOF 问题；API/Web Docker 构建上下文已调整为仓库根目录以包含共享 `tsconfig.base.json` 和工作区锁文件。

---

# P2：核心数据模型、迁移与权限

## P2.1 Prisma Schema 与迁移

- [x] `P2-01` 建立 Project、Season、Episode。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000100_init_project_hierarchy\migration.sql`。
  - 验证方式：设置 `DATABASE_URL` 后执行 `npx prisma format --schema api/prisma/schema.prisma` 和 `npx prisma validate --schema api/prisma/schema.prisma`；CI 增加同等 Schema 校验。
  - 验证结果：通过。Project、Season、Episode 已具备 UUID 主键、状态、版本号、时间字段、归档字段、父子外键和层级编号唯一约束。
- [x] `P2-02` 建立 SourceDocument、SourceDocumentVersion、SourceSegment。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000200_source_documents\migration.sql`、`E:\Project\ComicDrama\api\prisma\migrations\migration_lock.toml`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 `npx prisma format --schema api/prisma/schema.prisma`、`npx prisma validate --schema api/prisma/schema.prisma`、`npx prettier --check .` 和 `git diff --check`。
  - 验证结果：通过。Schema 校验、全仓库格式检查和 diff 空白检查均通过；迁移目录已补齐 PostgreSQL migration lock。
  - 备注：原始文件进入 MinIO/S3，数据库仅保存元数据、对象存储键和规范化文本；SourceDocumentVersion 不可变，`currentVersionId` 仅作为当前版本指针。真实 PostgreSQL `migrate deploy` 已在 P1-13 环境验证通过，迁移差异检查已完成。
- [x] `P2-03` 建立 Script、ScriptVersion、Scene、Beat、Dialogue。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000300_script_models\migration.sql`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 Prisma format/validate；以 P2-02 已提交 Schema 为基线生成迁移差异；执行 `npx prettier --check .` 和 `git diff --check`。
  - 验证结果：通过。Script、ScriptVersion、Scene、Beat、Dialogue 关系和 PostgreSQL 迁移已生成并通过 Schema 校验。
  - 备注：ScriptVersion 通过 `parentVersionId` 保留版本谱系，Scene/Beat/Dialogue 归属具体 ScriptVersion，并可引用 SourceSegment；真实 PostgreSQL `migrate deploy` 已在 P1-13 环境验证通过。
- [x] `P2-04` 建立 Shot、ShotVersion、ShotDependency、StoryboardPanel。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000400_shot_models\migration.sql`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 Prisma format/validate；以 P2-03 已提交 Schema 为基线生成迁移差异；执行 `npx prettier --check .` 和 `git diff --check`。
  - 验证结果：通过。镜头版本、版本谱系、镜头依赖、分镜面板和对象存储元数据模型已通过 Schema 校验。
  - 备注：Shot/ShotVersion 均固定到具体 ScriptVersion，ShotVersion 可引用 SourceSegment；角色、场景和道具的业务实体与强类型资产引用待 P2-06 补齐。真实 PostgreSQL `migrate deploy` 已在 P1-13 环境验证通过。
- [x] `P2-05` 建立 Asset、AssetVersion、AssetCollection、AssetReference。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000500_asset_models\migration.sql`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 Prisma format/validate；生成并检查 P2-05 PostgreSQL 迁移；在 Docker PostgreSQL 上执行 `prisma migrate deploy` 和 `prisma migrate status`；执行 Prettier 和 `git diff --check`。
  - 验证结果：通过。Asset、AssetVersion、AssetCollection/AssetCollectionItem、AssetReference 已建立；资产版本包含父版本谱系、对象存储元数据和不可变引用约束；ShotVersion 已建立资产引用关系；第 5 个迁移已成功应用，数据库状态为最新。
  - 备注：数据库仅保存资产元数据、哈希和对象存储 key，大文件进入 MinIO/S3；AssetReference 通过 `assetVersionId` 固定下游使用的版本，并为 ShotVersion 保留强类型外键。
- [x] `P2-06` 建立 Character、CharacterAppearance、VoiceProfile、Location、LocationVersion、SceneContinuity、Prop。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000600_character_location_prop_models\migration.sql`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 Prisma format/validate；生成并检查 PostgreSQL 迁移；在 Docker PostgreSQL 上执行 `prisma migrate deploy` 和 `prisma migrate status`；执行 `git diff --check`。
  - 验证结果：通过。角色基础资料、角色外观与不可变资产版本引用、可复用声音配置、场景逻辑资产及版本、场景连续性状态、道具逻辑资产均已建立；第 6 个迁移已成功应用，数据库状态为最新。
  - 备注：Character、Location、Prop 均可关联逻辑 Asset；CharacterAppearance、LocationVersion、VoiceProfile 样本固定到 AssetVersion；SceneContinuity 记录角色、场景、道具在场次中的状态快照。`subjectType` 与对应实体字段的一致性由后续 API 校验补齐。
- [x] `P2-07` 建立 Generation、GenerationCandidate、ProviderJob。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000700_generation_provider_models\migration.sql`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 Prisma format/validate；生成并检查 PostgreSQL 迁移；在 Docker PostgreSQL 上执行 `prisma migrate deploy` 和 `prisma migrate status`；执行 Prettier、类型检查、前后端构建、Python 编译和 `git diff --check`。
  - 验证结果：通过。Generation 保存目标、输入版本快照、Prompt、模型、参数、成本和候选选择；GenerationCandidate 保存多候选结果及对象存储元数据；ProviderJob 保存异步 Provider 外部任务、重试谱系、幂等键、原始请求/响应和轮询状态；第 7 个迁移已成功应用，数据库状态为最新。
  - 备注：`targetType`/`targetId` 为跨资源生成目标的多态引用，后续 API 层根据目标类型校验资源归属；候选结果可在人工选定后通过 `assetVersionId` 固化为可复用资产版本。
- [x] `P2-08` 建立 Workflow、WorkflowRun、Task、TaskAttempt。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api\prisma\schema.prisma`、`E:\Project\ComicDrama\api\prisma\migrations\20260919000800_workflow_task_models\migration.sql`、`E:\Project\ComicDrama\api\prisma\README.md`。
  - 验证方式：执行 Prisma format/validate；生成并检查 PostgreSQL 迁移；在 Docker PostgreSQL 上执行 `prisma migrate deploy` 和 `prisma migrate status`；执行 Prettier、类型检查、前后端构建、Python 编译和 `git diff --check`。
  - 验证结果：通过。Workflow 保存版本化定义；WorkflowRun 保存运行快照和状态；Task 保存资源、幂等键、优先级、重试上限、锁定/心跳和 traceId；TaskAttempt 保存每次 Worker 尝试、输出、错误和心跳；第 8 个迁移已成功应用，数据库状态为最新。
  - 备注：Task 的 Redis Streams 派发、认领、超时恢复、幂等消费和取消逻辑属于 P6 实施范围；本步骤先建立 PostgreSQL 事实源和后续协议所需字段。
- [x] `P2-09` 建立 Timeline、TimelineVersion、Track、Clip、Transition、Keyframe。
  - 完成日期：2026-09-19。
  - 实现位置：`api/prisma/schema.prisma`、`api/prisma/migrations/20260919154745_timeline_models/migration.sql`、`api/prisma/README.md`。
  - 验证方式：执行 Prisma format/validate；生成并应用 PostgreSQL 迁移；检查时间线版本谱系、帧时间基、轨道、素材/候选引用、转场和关键帧索引；执行完整 CI 静态检查。
  - 验证结果：通过。时间线以帧为统一单位，TimelineVersion 保存不可变编辑版本，Clip 可引用 AssetVersion 或 GenerationCandidate，Transition 连接前后 Clip，Keyframe 保存属性曲线；第 9 个迁移已应用，数据库状态为最新。
  - 备注：`sourceType` 与对应引用字段的一致性、同轨道片段重叠检查和时间范围校验由后续 API/渲染计划校验补齐。
- [x] `P2-10` 建立 Review、ReviewComment、Approval、RenderJob、RenderSegment、ExportPreset。
  - 完成日期：2026-09-19。
  - 实现位置：`api/prisma/schema.prisma`、`api/prisma/migrations/20260919161159_review_render_models/migration.sql`、`api/prisma/README.md`、`README.md`。
  - 验证方式：执行 Prisma format/validate；生成并检查 PostgreSQL 迁移；部署迁移并执行 migrate status；检查审核目标、审批历史、TimelineVersion 渲染引用、分段缓存和导出预设索引；执行完整 CI 静态检查。
  - 验证结果：通过。Review 支持版本/时间线/渲染任务等多态审核目标；ReviewComment 支持字段路径和帧级意见；Approval 保留审批历史；RenderJob 固定 TimelineVersion 与 ExportPreset；RenderSegment 支持局部渲染与分段缓存；第 10 个迁移已应用，数据库状态为最新。
  - 备注：审核目标存在性、项目归属、Reviewer/Director 角色和导出前审批闸门由后续 API/P9/P10 校验补齐；媒体文件进入 MinIO/S3，数据库保存对象存储键和元数据。
- [x] `P2-11` 建立 UsageRecord、CostRecord、AuditLog。
  - 完成日期：2026-09-21。
  - 实现位置：`api/prisma/schema.prisma`、`api/prisma/migrations/20260921000100_usage_cost_audit_models/migration.sql`、`api/prisma/README.md`、`README.md`、`workers/pyproject.toml`、`workers/uv.lock`、`.prettierignore`。
  - 验证方式：执行 Prisma format/validate；以前一版 Schema 为基线生成并检查 PostgreSQL 差异迁移；执行全仓库静态检查、构建、Worker 检查和 `git diff --check`；将 Ruff/Pytest 固化为 Worker 开发依赖，并忽略本地运行缓存。
  - 验证结果：通过 Schema 校验。UsageRecord 记录可计量资源用量；CostRecord 以定点金额保存估算/计提/退款/作废账目；AuditLog 追加保存关键操作的操作者、请求/追踪 ID 和变更快照。迁移已基于 P2-10 Schema 差异生成并完成 SQL 检查。
  - 备注：已在 PostgreSQL 可访问时执行 `prisma migrate deploy`，第 11 个迁移应用成功并通过 `migrate status`。P2-14～P2-17 将负责用户/团队权限和关键操作自动写入 AuditLog，P9/P10 将实现成本汇总、预算闸门和导出拦截。
- [x] `P2-12` 为所有核心表增加项目归属、创建/更新时间、软删除或归档策略、版本号和必要索引。
  - 完成日期：2026-09-21。
  - 实现位置：`api/prisma/schema.prisma`、`api/prisma/migrations/20260921000200_core_table_governance/migration.sql`、`api/prisma/README.md`、`README.md`。
  - 验证方式：执行 Prisma format/validate；以前一版 Schema 为基线生成并检查 PostgreSQL 差异迁移；检查历史项目归属回填、非空约束、外键、归档/状态索引和 `@updatedAt` 迁移默认值；执行全仓库静态检查、构建、Worker 检查和 `git diff --check`。
  - 验证结果：通过 Schema 校验。Episode、Script、Shot、Timeline 具有可索引、非空的直接 `projectId`；聚合根补齐乐观并发版本号，资产集合和导出预设补齐归档字段；TaskAttempt、Generation、GenerationCandidate、RenderSegment 补齐更新时间。版本快照、关联边和账本/审计记录遵循不可变/追加式策略，不以软删除或更新时间覆盖历史。
  - 备注：迁移会从 Season → Episode → Script → Shot/Timeline 链路回填项目归属，遇到无法回填数据会中止。已在 PostgreSQL 可访问时执行 `prisma migrate deploy`，第 12 个迁移应用成功并通过 `migrate status`。P2-13 已补齐种子数据和正式回滚操作说明。
- [x] `P2-13` 编写迁移、种子数据和回滚说明。
  - 完成日期：2026-09-21。
  - 实现位置：`docs/database-migrations.md`、`api/prisma/seed.js`、`api/package.json`、`api/prisma/README.md`、`README.md`。
  - 验证方式：执行 `node --check api/prisma/seed.js`、`npm run prisma:format --workspace api`、设置 `DATABASE_URL` 后执行 `npm run prisma:validate --workspace api`、执行 Prettier 和 `git diff --check`；数据库可用时按手册执行 `migrate deploy`、`migrate status`，并在隔离库连续运行两次 `prisma:seed` 验证幂等性。
  - 验证结果：已执行 `prisma migrate deploy`，18 个迁移全部成功应用；`prisma migrate status` 显示数据库已是最新；`prisma:seed` 连续执行两次，固定种子链和用户/团队/授权关系幂等。期间修复 P3-08 迁移 SQL 的 UTF-8 BOM 后重新完成部署。
  - 备注：当前数据库还保留本轮上传样本产生的额外 SourceDocument；生产环境不得运行演示种子，已应用历史迁移不得直接编辑。

## P2.2 访问控制与审计

- [x] `P2-14` 实现用户、团队、成员关系和项目权限。
  - 完成日期：2026-09-22。
  - 实现位置：`api/prisma/schema.prisma`、`api/prisma/migrations/20260922000100_access_control_models/migration.sql`、`api/prisma/seed.js`、`api/prisma/README.md`、`README.md`。
  - 验证方式：Prisma format/validate、migration SQL review、seed syntax、Prettier、`git diff --check`；数据库可用后执行 migrate deploy/status，并验证 seed 关系和项目访问级别。
  - 验证结果：18 个迁移已部署；seed 已真实写入并确认 User、Team、TeamMember、ProjectMember、ProjectTeam 和项目访问级别关系；固定种子可重复执行。
  - 备注：P2-14 只建立通用访问级别，业务角色在 P2-15，API 权限守卫在 P2-16。
- [x] `P2-15` 首版实现 Owner、Producer、Director、Screenwriter、Storyboard Artist、Asset Artist、Editor、Reviewer、Viewer 角色。
  - 完成日期：2026-09-22。
  - 实现位置：`api/prisma/schema.prisma`、`api/prisma/migrations/20260922000200_business_roles/migration.sql`、`api/prisma/seed.js`、`api/prisma/README.md`、`README.md`。
  - 验证方式：Prisma format/validate、migration SQL review、seed syntax、Prettier、`git diff --check`；数据库可用后执行 migrate deploy/status，并验证直接成员与团队角色分配关系。
  - 验证结果：18 个迁移已部署；seed 已真实写入 EDITOR 直接成员角色和 OWNER 团队角色分配，并通过重复 seed 验证关系保持幂等。
  - 备注：P2-15 只定义角色和分配关系，角色操作矩阵、团队继承和资源级权限在 P2-16 实现。
- [x] `P2-16` 实现 API 级权限守卫和资源级访问检查。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/access/`、`api/src/common/prisma.service.ts`、`api/src/app.module.ts`、`docs/api-contracts.md`。
  - 验证方式：Prisma validate/generate、API typecheck/lint/build、Prettier、`git diff --check`；数据库可用后使用种子用户调用受保护端点验证 401/403、直接成员权限和团队继承权限。
  - 验证结果：使用真实种子用户调用 `GET /api/projects/:projectId/access-check`，无身份返回 401，未授权用户返回 403，直接成员 editor 和团队继承 owner 均返回 200；项目归属和访问级别检查通过。
  - 备注：当前 `x-user-id` 仅是受信任网关身份适配层，生产环境必须由认证网关或身份中间件提供，不得把客户端任意提交的用户 ID 当作凭据。
- [x] `P2-17` 将关键操作写入 AuditLog：导入、生成、修改、审核、锁定、导出、删除/归档。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/audit/audit-action.decorator.ts`、`api/src/audit/audit-log.interceptor.ts`、`api/src/audit/audit-log.service.ts`、`api/src/audit/audit-log.module.ts`、`api/src/app.module.ts`、`docs/api-contracts.md`。
  - 验证方式：Prisma generate、API typecheck/lint/build、全仓库 Prettier、`git diff --check`；数据库可用后通过带 `@AuditAction` 的真实业务接口验证 AuditLog 追加写入及 requestId/traceId/操作者/项目归属。
  - 验证结果：真实生成接口已追加 AuditLog，并核对 `action`、`entityType`、`projectId`、`actorId`、`actorType`、`requestId`、`traceId` 和 `after` 快照均已写入；新建任务型分段接口返回的 `task.id` 也已回填到 `entityId`；同时修正 UUID 校验以支持稳定种子 UUID。
  - 备注：拦截器先读取路由/查询/请求体参数；若新建任务型接口未提供实体参数，则从响应的 `data.id` 或顶层 `id` 回填 `entityId`。已使用真实分段接口和 PostgreSQL 审计记录完成核对。
- [x] `P2-18` 实现版本创建规则：已进入下游的版本不可原地修改，只能创建新版本。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/versioning/versioning.service.ts`、`api/src/versioning/versioning.module.ts`、`api/src/app.module.ts`、`docs/api-contracts.md`。
  - 验证方式：API typecheck/lint/build、Prettier、`git diff --check`；数据库可用后验证创建版本、父版本归属、下游引用不可变，并通过临时 PostgreSQL 触发器注入聚合根更新失败，确认事务回滚。
  - 验证结果：真实 PostgreSQL 验证创建 ScriptVersion v2、自动继承 v1 为 `parentVersionId`、聚合根 `version/currentVersionId` 更新、下游 Scene 引用 v2，以及下游引用后原地修改被拒绝；故障注入时 `createScriptVersion()` 正确失败，Script 版本号、当前版本指针、版本行数量和测试版本均保持回滚前状态。
  - 备注：已使用临时触发器完成事务失败回滚专项验证，并删除触发器和函数；未向仓库提交故障注入对象。
  - 阶段出口：能通过数据库测试证明权限隔离、版本不可变性和关键操作可追溯。

---

# P3：原文导入与内容理解

## P3.1 原文事实源

- [x] `P3-01` 实现 TXT、DOCX 和 Markdown 上传。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/source-documents/source-document-upload.controller.ts`、`api/src/source-documents/source-document-upload.service.ts`、`api/src/source-documents/source-document.module.ts`、`api/src/app.module.ts`、`docs/api-contracts.md`。
  - 验证方式：上传类型服务校验、API typecheck/lint/build、全仓库 Prettier、`git diff --check`；真实请求需在数据库和认证上下文可用后验证 `POST /api/projects/:projectId/source-documents/upload`。
  - 验证结果：使用固定种子项目和 editor 用户真实调用 multipart 上传，返回 201，类型识别为 MARKDOWN，单文件 10 MiB 约束和项目 EDIT 权限链路生效。
  - 备注：上传内容已进入 P3-02/P3-03 的对象存储和版本持久化链路。
- [x] `P3-02` 计算文件哈希并保存原始文件到 MinIO/S3。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/source-documents/object-storage.service.ts`、`api/src/source-documents/object-storage.module.ts`、`api/src/source-documents/source-document-upload.service.ts`、`api/src/source-documents/source-document-upload.controller.ts`、`api/src/source-documents/source-document.module.ts`、`infra/docker-compose.yml`、`infra/minio/buckets.md`、`docs/api-contracts.md`。
  - 验证方式：SHA-256 计算、API typecheck/lint/build、Prettier、`git diff --check`、Compose 配置检查；真实 MinIO 上传需在 Docker 服务实际启动后验证。
  - 验证结果：真实 MinIO 上传返回 `storageStatus=STORED`、SHA-256、`storageKey`、MIME 和大小；随后解析接口能够从该对象键读回原始内容，证明对象写入/读取链路可用。
  - 备注：实现不绑定 AWS，支持本地 MinIO、AWS S3 和其他 S3-compatible 服务。
- [x] `P3-03` 创建不可变 SourceDocumentVersion，记录导入时间、解析状态和文件元数据。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/versioning/versioning.service.ts`、`api/src/source-documents/source-document-upload.service.ts`、`api/src/source-documents/source-document.module.ts`、`docs/api-contracts.md`。
  - 验证方式：API lint/typecheck/build、全仓库 Prettier、`git diff --check`；在真实 PostgreSQL/MinIO 启动后注入版本登记失败，确认上传对象被删除且数据库无新增 SourceDocument。
  - 验证结果：真实上传成功后创建 `SourceDocument` 和首个不可变 `SourceDocumentVersion`，返回 documentId/versionId、文件元数据和 `IMPORTING` 初始状态信息；后续解析完成后版本进入 READY。故障注入版本登记失败时，捕获的 MinIO `storageKey` 与清理 key 一致，`getObject` 返回 `NoSuchKey`，数据库记录数保持不变。
  - 备注：成功路径和数据库写入失败后的 MinIO 对象清理均已完成真实服务验证；实现继续保持 S3-compatible，不绑定 AWS。
- [x] `P3-04` 完成章节、段落、字符偏移量和来源位置解析。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/source-documents/source-document-parser.service.ts`、`api/src/source-documents/source-document-parse.service.ts`、`api/src/source-documents/object-storage.service.ts`、`api/src/source-documents/source-document-upload.controller.ts`、`api/src/source-documents/source-document.module.ts`、`api/src/versioning/versioning.module.ts`、`docs/api-contracts.md`。
  - 验证方式：API typecheck/lint/build、全仓库 Prettier、`git diff --check`；真实对象存储和 PostgreSQL 请求需在 Docker 服务可用后补充执行。
  - 验证结果：真实解析 Markdown 返回 READY，`textLength=4824`、`segmentCount=84`，其中 DOCUMENT 1、CHAPTER 3、SECTION 14、PARAGRAPH 66；UTF-16 偏移和行号来源树可被后续查询读取。
  - 备注：DOCX 上传仍可接收并保存原始对象，但 P3-04 不解析 DOCX；更多格式 Parser 留给 P3-06 及后续任务。
- [x] `P3-05` 提供原文预览、章节选择和段落定位 API。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/source-documents/source-document-read.service.ts`、`api/src/source-documents/source-document-read.controller.ts`、`api/src/source-documents/source-document.module.ts`、`README.md`、`docs/api-contracts.md`。
  - 验证方式：API typecheck/lint/build、全仓库 Prettier、`git diff --check`；真实 PostgreSQL 查询需在 Docker 服务可用后补充执行集成验证。
  - 验证结果：真实调用预览接口返回 READY 正文片段；章节查询返回 3 个 CHAPTER，且包含标题、偏移、行号和父节点；项目/文档/版本归属校验链路生效。
  - 备注：预览读取数据库中的规范化 `textContent`，不会读取或修改原始对象；DOCX 仍需后续 Parser 实现。
- [x] `P3-06` 为 DOCX、EPUB、PDF、Fountain、Final Draft XML 建立 Parser 接口和待实现任务，不在 V1 阻塞主线。
  - 完成日期：2026-09-22。
  - 实现位置：`api/src/source-documents/source-document-parser.interface.ts`、`api/src/source-documents/source-document-parser-registry.service.ts`、`api/src/source-documents/source-document-parser.service.ts`、`api/src/source-documents/source-document-parse.service.ts`、`api/src/source-documents/source-document.module.ts`、`README.md`、`docs/api-contracts.md`。
  - 验证方式：API typecheck/lint/build、全仓库 Prettier、`git diff --check`；真实格式样本解析需在后续对应 Parser 实现任务完成后补充。
  - 验证结果：真实 Markdown 解析通过注册表选择 `builtin-text-markdown@1.1.0`；真实 DOCX 请求返回 400，并明确提示 P3-06-DOCX 待实现任务，未将二进制内容误当作 UTF-8 文本解析。
  - 备注：其他未实现格式仍需在对应 Parser 任务完成后补充有效格式样本解析验证。

## P3.2 分层理解流水线

- [x] `P3-07` 实现文档清洗、切章、切段和可重入任务。
  - 完成日期：2026-09-23。
  - 实现位置：`api/src/source-documents/source-document-parser.service.ts`、`api/src/source-documents/source-document-parse.service.ts`、`api/src/source-documents/source-document-segmentation.service.ts`、`api/src/source-documents/source-document-segmentation.controller.ts`、`api/src/source-documents/source-document-upload.controller.ts`、`api/src/source-documents/source-document.module.ts`、`packages/contracts/src/task.ts`、`README.md`、`docs/api-contracts.md`。
  - 验证方式：API typecheck/lint/build、全仓库 Prettier、`git diff --check`；真实 PostgreSQL/对象存储请求需在 Docker 服务可用后补充执行。
  - 验证结果：真实分段任务返回 `SUCCEEDED`，结果为 READY、84 个来源节点；重复提交返回同一 task ID、同一幂等键和同一 attempt=1，GET task 可读取完整结果。
  - 边界修复（2026-09-25）：重解析同一版本时，事务先清理 P3-08～P3-11 派生结果和对应旧任务，再删除旧 SourceSegment，保留 ExtractedEntityMention.sourceSegment 与 SourceDraftCitation.sourceSegment 的 Restrict 外键作为安全网。
  - 备注：当前任务执行器在 API 内同步调用解析服务；后续接入 P6 Worker/Streams 时复用同一幂等键和任务记录，不把原始文件写入数据库。
- [x] `P3-08` 实现分章实体提取：角色、地点、道具、组织、时间、事件。
  - 完成日期：2026-09-25。
  - 实现位置：`api/prisma/migrations/20260925000100_chapter_entity_extractions/migration.sql`、`api/src/source-documents/chapter-entity-extractor.interface.ts`、`api/src/source-documents/builtin-chapter-entity-extractor.service.ts`、`api/src/source-documents/chapter-entity-extraction.service.ts`、`api/src/source-documents/chapter-entity-extraction.controller.ts`、`api/src/source-documents/source-document.module.ts`、`api/scripts/chapter-entity-extractor.test.js`、`packages/contracts/src/task.ts`、`README.md`、`docs/api-contracts.md`、`api/prisma/README.md`。
  - 验证方式：Prisma format/validate/generate、API typecheck/lint/build、规则提取器样本 smoke test、全仓库 Prettier、`git diff --check`；真实 PostgreSQL API 集成请求需在 Docker 服务启动并部署迁移后补充执行。
  - 验证结果：真实 API + PostgreSQL 调用已通过，任务状态为 `SUCCEEDED`，生成 entityCount=4、mentionCount=4；实体提取结果可回溯到来源段落、UTF-16 偏移和行号。
  - 备注：当前为 `builtin-rule-chapter-entity-extractor@1.0.0` 确定性候选提取，不是 LLM 或人工确认；不会直接写入 Character/Location/Prop 主数据。跨章节归并留给 P3-09，关系/全局时间线留给 P3-10。
- [x] `P3-09` 实现跨章节实体合并和别名归一化。
  - 完成日期：2026-09-25。
  - 实现位置：`api/prisma/migrations/20260925000200_cross_chapter_entity_resolution/migration.sql`、`api/src/source-documents/builtin-entity-normalizer.service.ts`、`api/src/source-documents/cross-chapter-entity-resolution.service.ts`、`api/src/source-documents/cross-chapter-entity-resolution.controller.ts`、`api/src/source-documents/source-document.module.ts`、`api/scripts/chapter-entity-extractor.test.js`、`packages/contracts/src/task.ts`、`README.md`、`docs/api-contracts.md`、`api/prisma/README.md`。
  - 验证方式：Prisma format/validate/generate、API typecheck/lint/build、归一化规则 smoke test、全仓库 Prettier、`git diff --check`；真实 PostgreSQL API 集成请求需在 Docker 服务启动并部署迁移后补充执行。
  - 验证结果：真实 API + PostgreSQL 调用已通过，任务状态为 `SUCCEEDED`，生成 candidateEntityCount=4、canonicalEntityCount=4、aliasCount=4；原始候选、别名、章节来源和归并方法均已保留。
  - 备注：仅在同一不可变 `SourceDocumentVersion` 内对 P3-08 成功结果归并；不是 LLM、人工确认或语义推断。不能确定的别名保持分离，不会改写 ExtractedEntity/mention 或直接写入 Character/Location/Prop 主数据。
- [x] `P3-10` 实现人物关系、时间线和关键事件的结构化结果。
  - 完成日期：2026-09-25。
  - 实现位置：`api/prisma/migrations/20260925000300_narrative_structure/migration.sql`、`api/src/source-documents/narrative-structure.service.ts`、`api/src/source-documents/narrative-structure.controller.ts`、`api/src/source-documents/source-document.module.ts`、`api/scripts/chapter-entity-extractor.test.js`、`packages/contracts/src/task.ts`、`README.md`、`docs/api-contracts.md`、`api/prisma/README.md`。
  - 验证方式：Prisma format/validate/generate、API typecheck/lint/build、叙事结构规则 smoke test、全仓库 Prettier、`git diff --check`；真实 PostgreSQL API 集成请求需在 Docker 服务启动并部署迁移后补充执行。
  - 验证结果：真实 API + PostgreSQL 调用已通过，任务状态为 `SUCCEEDED`，生成 relationshipCount=1、eventCount=1、timelineEntryCount=1，并保留章节证据、时间/地点锚点和人物参与者。
  - 备注：当前为 `builtin-chapter-cooccurrence-narrative-analyzer@1.0.0` 确定性候选分析，不是 LLM、人工确认或语义/因果推断；`CO_OCCURRENCE` 仅表示同章出现。
- [x] `P3-11` 生成世界观、角色、场景、道具初稿数据，并保留来源引用。
  - 完成日期：2026-09-25。
  - 实现位置：`api/prisma/migrations/20260925000400_source_draft_generation/migration.sql`、`api/src/source-documents/source-draft-generation.service.ts`、`api/src/source-documents/source-draft-generation.controller.ts`、`api/src/source-documents/source-document.module.ts`、`api/scripts/source-draft-generation.test.js`、`README.md`、`docs/api-contracts.md`、`api/prisma/README.md`。
  - 验证方式：Prisma format/validate/generate、API build/test/lint、全仓库格式检查、`git diff --check`；真实 PostgreSQL API 集成请求需在 Docker 服务启动并部署迁移后补充执行。
  - 验证结果：真实 API + PostgreSQL 调用已通过，P3-09 → P3-10 → P3-11 链路状态均为 `SUCCEEDED`；生成 4 个可追溯初稿项目，并保存来源段落、精确文本、UTF-16 偏移、行号和置信度引用。
  - 备注：当前使用 `builtin-cited-source-draft-generator@1.0.0` 确定性生成，不是 LLM 或人工定稿；无证据的字段为空并进入 `openQuestions`，不写入正式 Character、Location、Prop 主数据。

> 验证审计（2026-09-25）：P2-13～P2-18、P3-01～P3-11 已完成本地 PostgreSQL/MinIO/API 真实链路与故障注入验证。P2-18 事务回滚、P2-17 新建任务型 `entityId` 回填、P3-03 数据库失败后的对象清理，以及 P3-07 旧种子数据重解析外键边界均已闭环；重试分段任务最终为 `SUCCEEDED`，新建 84 个分段，并验证新章节实体提取任务为 `SUCCEEDED`。下一步进入 P3-12。

- [x] `P3-12` 实现结构化 JSON Schema 校验、错误项标记和人工修正入口。
  - 完成日期：2026-09-25。
  - 实现位置：`api/prisma/migrations/20260925000500_source_draft_validation/migration.sql`、`api/src/source-documents/source-draft.schema.ts`、`api/src/source-documents/source-draft-generation.service.ts`、`api/src/source-documents/source-draft-generation.controller.ts`、`api/scripts/source-draft-validation.test.js`、`packages/contracts/src/source-draft.ts`、`README.md`、`docs/api-contracts.md`、`api/prisma/README.md`。
  - 验证方式：Docker PostgreSQL 迁移、Prisma 状态/生成、API 单测、typecheck/build，以及本机临时 API（3011）真实回归；使用种子项目、Editor 身份和既有 P3-11 初稿验证 GET、批量校验、非法修正、合法修正、权限和审计。
  - 验证结果：迁移首次因 Windows PowerShell UTF-8 BOM 失败，已将迁移文件改为 UTF-8 无 BOM，执行 `migrate resolve --rolled-back` 后重新部署成功；`prisma migrate status` 显示数据库 schema up to date。真实 API 返回 `200/201`：初稿 `23` 项（WORLD 1、CHARACTER 3、LOCATION 8、PROP 11），批量校验后 `validatedCount=23`；非法 PATCH 进入 `NEEDS_REVIEW` 并保存 JSON 校验错误，合法 PATCH 后进入 `CORRECTED`，并写入 `reviewedAt`、Editor `reviewedBy`；未认证请求为 `401`，Editor 读取为 `200`；数据库核验到 `REVIEW` 与 `UPDATE` 审计日志且包含响应快照。
  - 自动化验证：`npm test --workspace api`、`npm run typecheck --workspace api`、`npm run build --workspace api` 均通过；其中 API 测试包含章节实体、初稿生成和校验 Schema smoke test。
  - 备注：P3-12 只修改独立的 SourceDraft 审阅层，不覆盖 P3-08～P3-11 事实源、引用或正式 `Character`、`Location`、`Prop` 主数据。
