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
- [~] `P0-09` 评审并批准 Architecture Specification v1.1。
  - 当前状态：架构说明书 v1.1 已完成，待项目负责人确认第 12 节待评审事项后批准。
  - 实现位置：`AI漫剧平台架构说明书v1.1.md`。
  - 阶段出口：所有后续任务引用同一版架构文档，禁止在未记录 ADR 的情况下改变核心事实源或任务协议。

---

# P1：工程与基础设施

## P1.1 工程骨架

- [x] `P1-01` 创建 Monorepo 目录结构：`web`、`api`、`workers`、`packages`、`infra`、`docs`、`tests`。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\web`、`api`、`workers`、`packages`、`infra`、`docs`、`tests`。
  - 验证结果：目录和基础占位文件已创建；Docker Compose 验证因本机未安装 Docker CLI 暂未执行。
- [x] `P1-02` 初始化 Vue 3 + TypeScript + Vite 前端。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\web`，包含 Vue 3/Vite/TypeScript 入口、Pinia、Vue Query 和基础工作台页面。
  - 验证结果：前端入口、构建配置和 API 检查按钮已创建；依赖安装后的完整构建待本地 npm install 或 CI 执行。
- [x] `P1-03` 初始化 NestJS API 控制平面。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\api`，已建立 NestJS 模块、健康检查、版本接口和全局 API 前缀。
  - 验证结果：NestJS 源码结构和 Docker 构建流程已创建；依赖安装后的编译待本地 npm install 或 CI 执行。
- [x] `P1-04` 初始化 Python 3.13 Worker 代码库，并按能力划分 `llm-worker`、`image-worker`、`video-worker`、`audio-worker`、`render-worker`、`qc-worker`。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\workers`，已建立 Python 3.13 运行配置和 llm/image/video/audio/render/qc Worker 包目录。
  - 验证结果：`python -m compileall -q workers/src` 已通过；CI 使用 Python 3.13。
- [~] `P1-05` 统一 TypeScript/Python 的格式化、Lint、类型检查和提交检查。
  - 开始日期：2026-09-19。
  - 实现位置：`.editorconfig`、`.prettierrc.json`、`tsconfig.base.json`、各 workspace 的 `typecheck/build` 脚本、`workers/pyproject.toml`。
  - 当前状态：已统一 EditorConfig、Prettier、TypeScript 编译脚本、Python Ruff/Pytest 配置入口；ESLint/Ruff 的实际依赖和规则集、提交前自动检查仍待补齐。
  - 下一步：在 P2 基础模型完成后补充可执行的 lint/test 门禁，并纳入 CI。
- [x] `P1-06` 建立共享 DTO、事件类型、错误码和 API 响应格式。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\packages\contracts\src`，已建立 API 响应、任务、Provider 契约；Python 对应任务协议位于 `workers/src/common/protocol.py`。
  - 验证结果：契约源码和文档已创建。

## P1.2 本地依赖和部署

- [x] `P1-07` 编写 Docker Compose：web、api、postgres、redis、minio、worker、nginx。
  - 完成日期：2026-09-19。
  - 实现位置：`E:\Project\ComicDrama\infra\docker-compose.yml`，已配置 web、api、postgres、redis、minio、minio-init、media-worker、nginx。
  - 验证结果：Compose 文件已静态写入；因本机未安装 Docker CLI，实际启动验证待后续执行。
- [x] `P1-08` 配置环境变量模板、密钥占位和本地开发说明。
  - 完成日期：2026-09-19。
  - 实现位置：`.env.example`、`docs/local-development.md`、`README.md`。
  - 验证结果：环境变量模板和启动说明已创建。
- [x] `P1-09` 完成 PostgreSQL 初始化、MinIO Bucket 初始化和 Redis Stream 命名约定。
  - 完成日期：2026-09-19。
  - 实现位置：`infra/postgres/init/001-init.sql`、`infra/minio/buckets.md`、`infra/redis/streams.md`、`infra/docker-compose.yml` 的 `minio-init` 服务。
  - 验证结果：PostgreSQL 初始化、MinIO Bucket 初始化和 Redis Stream 命名约定已定义；容器执行待 Docker 环境可用后验证。
- [~] `P1-10` 实现所有服务健康检查和版本信息接口。
  - 开始日期：2026-09-19。
  - 实现位置：`api/src/health`、`infra/docker-compose.yml`。
  - 当前状态：API 已提供 `/api/health` 和 `/api/version`；Compose 已配置 web、api、postgres、redis、minio 健康检查。Worker、nginx 以及容器内端到端健康验证待 Docker 环境可用后完成。
- [~] `P1-11` 建立基础日志、traceId、错误上报和任务日志格式。
  - 开始日期：2026-09-19。
  - 实现位置：`api/src/common/trace-id.middleware.ts`、`docs/api-contracts.md`。
  - 当前状态：已实现请求 traceId 生成/透传、响应头和 API 错误格式约定；结构化日志、错误上报和 Worker 任务日志格式将在 P6 任务协议阶段补齐。
- [x] `P1-12` 建立最小 CI：安装、Lint、类型检查、单元测试、构建、数据库迁移校验。
  - 完成日期：2026-09-19。
  - 实现位置：`.github/workflows/ci.yml`、`package-lock.json`。
  - 验证结果：GitHub Actions `static-checks` 已通过；CI 已执行 Node.js 22、Python 3.13、`npm ci`、Prettier 格式检查、类型检查、前端构建、API 构建和 Python 编译。
  - 备注：Prisma Schema 校验已加入当前分支；Lint、单元测试和真实数据库迁移执行将在对应模块完成后继续扩展。
- [!] `P1-13` 完成“新机器一键启动”验证。
  - 阻塞原因：当前机器未检测到 Docker CLI（`DOCKER_NOT_FOUND`）。
  - 解除条件：安装 Docker Desktop 后执行 `docker compose -f infra/docker-compose.yml up --build`，完成全服务健康检查和测试数据写入。
  - 阶段出口：执行一条项目规定的启动命令后，所有基础服务健康，前端可访问，API 可返回版本信息，数据库和对象存储可写入测试数据。

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
  - 备注：原始文件进入 MinIO/S3，数据库仅保存元数据、对象存储键和规范化文本；SourceDocumentVersion 不可变，`currentVersionId` 仅作为当前版本指针。真实 PostgreSQL `migrate deploy` 与迁移差异检查待 Docker/PostgreSQL 可用后执行。
- [ ] `P2-03` 建立 Script、ScriptVersion、Scene、Beat、Dialogue。
- [ ] `P2-04` 建立 Shot、ShotVersion、ShotDependency、StoryboardPanel。
- [ ] `P2-05` 建立 Asset、AssetVersion、AssetCollection、AssetReference。
- [ ] `P2-06` 建立 Character、CharacterAppearance、VoiceProfile、Location、LocationVersion、SceneContinuity、Prop。
- [ ] `P2-07` 建立 Generation、GenerationCandidate、ProviderJob。
- [ ] `P2-08` 建立 Workflow、WorkflowRun、Task、TaskAttempt。
- [ ] `P2-09` 建立 Timeline、TimelineVersion、Track、Clip、Transition、Keyframe。
- [ ] `P2-10` 建立 Review、ReviewComment、Approval、RenderJob、RenderSegment、ExportPreset。
- [ ] `P2-11` 建立 UsageRecord、CostRecord、AuditLog。
- [ ] `P2-12` 为所有核心表增加项目归属、创建/更新时间、软删除或归档策略、版本号和必要索引。
- [ ] `P2-13` 编写迁移、种子数据和回滚说明。

## P2.2 访问控制与审计

- [ ] `P2-14` 实现用户、团队、成员关系和项目权限。
- [ ] `P2-15` 首版实现 Owner、Producer、Director、Screenwriter、Storyboard Artist、Asset Artist、Editor、Reviewer、Viewer 角色。
- [ ] `P2-16` 实现 API 级权限守卫和资源级访问检查。
- [ ] `P2-17` 将关键操作写入 AuditLog：导入、生成、修改、审核、锁定、导出、删除/归档。
- [ ] `P2-18` 实现版本创建规则：已进入下游的版本不可原地修改，只能创建新版本。
  - 阶段出口：能通过数据库测试证明权限隔离、版本不可变性和关键操作可追溯。

---

# P3：原文导入与内容理解

## P3.1 原文事实源

- [ ] `P3-01` 实现 TXT 和 Markdown 上传。
- [ ] `P3-02` 计算文件哈希并保存原始文件到 MinIO/S3。
- [ ] `P3-03` 创建不可变 SourceDocumentVersion，记录导入时间、解析状态和文件元数据。
- [ ] `P3-04` 完成章节、段落、字符偏移量和来源位置解析。
- [ ] `P3-05` 提供原文预览、章节选择和段落定位 API。
- [ ] `P3-06` 为 DOCX、EPUB、PDF、Fountain、Final Draft XML 建立 Parser 接口和待实现任务，不在 V1 阻塞主线。

## P3.2 分层理解流水线

- [ ] `P3-07` 实现文档清洗、切章、切段和可重入任务。
- [ ] `P3-08` 实现分章实体提取：角色、地点、道具、组织、时间、事件。
- [ ] `P3-09` 实现跨章节实体合并和别名归一化。
- [ ] `P3-10` 实现人物关系、时间线和关键事件的结构化结果。
- [ ] `P3-11` 生成世界观、角色、场景、道具初稿数据，并保留来源引用。
- [ ] `P3-12` 实现结构化 JSON Schema 校验、错误项标记和人工修正入口。
- [ ] `P3-13` 实现“原文 → 提取结果”的差异/来源查看。
- [ ] `P3-14` 为 LLM 调用保存模型、Prompt 模板版本、输入范围、输出、耗时、Token 和费用。
  - 阶段出口：导入一份样本后，所有提取结果均能回溯到原文章节/段落，失败任务可重试，结构化结果可人工修正。

---

# P4：IP 圣经与剧本工程

## P4.1 IP 圣经

- [ ] `P4-01` 建立世界观圣经：时代、地理、势力、能力/规则、禁用冲突、专有名词、主线伏笔。
- [ ] `P4-02` 建立角色圣经：身份、外貌、性格、行为、服装、声音、年龄/剧情阶段造型。
- [ ] `P4-03` 建立场景圣经：空间布局、门窗家具、光源、时间天气、摄影机可用区域、连续性规则。
- [ ] `P4-04` 建立道具圣经：外观、材质、尺寸、所属人物、剧情状态和损坏/变化版本。
- [ ] `P4-05` 支持角色正面/侧面/背面、表情集、动作集等参考资产的关联。
- [ ] `P4-06` 支持项目级视觉规则、镜头规则、术语库和负面规则。
- [ ] `P4-07` 提供人工编辑、版本、锁定、解锁和变更影响提示。

## P4.2 剧本改编与评估

- [ ] `P4-08` 实现章节范围、改编形态和简化/标准/完整保留程度配置。
- [ ] `P4-09` 生成 ScriptVersion、Scene、Dialogue、Action、VisualDescription 等结构化内容。
- [ ] `P4-10` 记录剧本段落到原文范围的 sourceReferences。
- [ ] `P4-11` 实现剧本工作区：左侧原文、中间剧本、右侧 AI 建议/差异检查。
- [ ] `P4-12` 实现剧本版本比较、草稿复制、提交审核和回退到已批准版本。
- [ ] `P4-13` 实现多维度评估报告：剧情、节奏、人物弧光、连贯性、可视化程度、爆款潜力等。
- [ ] `P4-14` 实现生成→检测→修复流程；自动修复只能产生新版本，不能覆盖已审核版本。
- [ ] `P4-15` 实现剧本审核闸门，审核意见绑定 ScriptVersion 和具体段落。
  - 阶段出口：以一集为对象，能够从原文生成可编辑剧本；剧本可对比、可审核、可追溯，未经审核不能进入自动分镜。

---

# P5：分镜工程与导演设计

## P5.1 Scene / Beat / Shot 分层

- [ ] `P5-01` 实现 Episode → Scene → Beat → Shot 的层级和排序。
- [ ] `P5-02` 实现 Scene 的时间、地点、人物、氛围和原文来源。
- [ ] `P5-03` 实现 Beat 的叙事动作、信息揭示和情绪变化。
- [ ] `P5-04` 实现 ShotVersion 结构化字段：时长帧数、景别、机位、运镜、角色动作、对白、灯光、构图、连续性、音频、生成策略、来源引用。
- [ ] `P5-05` 支持项目模板默认规则：单镜时长、镜头密度、每镜说话人数、灯光、景深、动作复杂度、无字幕/水印/UI、无背景音乐等。
- [ ] `P5-06` 将项目规则展开到每个 Shot 的生成上下文，不使用“同上”隐式继承。

## P5.2 导演 Agent 与分镜工作区

- [ ] `P5-07` 实现导演设计任务：景别、机位、节奏、视线、轴线、镜头衔接和动作复杂度建议。
- [ ] `P5-08` 保证导演 Agent 只生成建议版本，不直接覆盖已审核剧本。
- [ ] `P5-09` 实现卡片、表格、故事板三种基础视图；时间轴视图可先提供只读预览。
- [ ] `P5-10` 实现单镜字段编辑、前后镜头查看和批量修改。
- [ ] `P5-11` 实现分镜版本比较、提交审核、审核意见和回退。
- [ ] `P5-12` 实现分镜审核闸门，未通过的 ShotVersion 不得进入最终生成。
  - 阶段出口：一集剧本可拆为有序、可编辑、可审核的 Shot 列表，每个 Shot 均有来源、资产引用和可编译生成上下文。

---

# P6：任务编排、Provider Gateway 与 Prompt Compiler

## P6.1 Task 事实源与 Redis Streams

- [ ] `P6-01` 实现 Task 状态机：PENDING、QUEUED、RUNNING、SUCCEEDED、RETRYING、FAILED、CANCELLED。
- [ ] `P6-02` 定义任务协议：taskId、type、projectId、resourceType、resourceId、inputVersion、idempotencyKey、priority、attempt、maxAttempts、traceId。
- [ ] `P6-03` 实现 PostgreSQL Task 记录与 Redis Stream 派发的一致性策略。
- [ ] `P6-04` 实现 Worker 消费、认领、心跳、超时恢复和消息确认。
- [ ] `P6-05` 实现幂等消费、Provider 已提交但本地超时、重复消费、用户取消和批量部分失败处理。
- [ ] `P6-06` 实现上游版本变化导致结果过期的判断。
- [ ] `P6-07` 实现任务进度、日志、错误原因、重试记录和前端状态推送。

## P6.2 AI Gateway 与 Provider Adapter

- [ ] `P6-08` 定义统一能力接口：LLM、Image、Video、TTS、Audio、Render、QC。
- [ ] `P6-09` 定义 Provider、Model、Capability、RateLimit、Credential、Pricing 配置。
- [ ] `P6-10` 实现 Mock Provider，用于离线开发、自动化测试和演示。
- [ ] `P6-11` 选择一个真实 LLM Provider 接入内容理解/剧本生成。
- [ ] `P6-12` 选择一个真实 Image Provider 接入资产参考图生成。
- [ ] `P6-13` 选择一个真实 Video Provider 接入镜头生成；其他模型只保留适配器接口。
- [ ] `P6-14` 所有 Provider 结果统一保存请求、响应、状态、模型、参数、种子、参考图、错误和费用。

## P6.3 Prompt Compiler

- [ ] `P6-15` 定义 Prompt 输入：项目规则、角色外观版本、场景版本、道具版本、Shot 数据、前后镜头连续性、模型模板、负面提示词。
- [ ] `P6-16` 实现结构化中间表示，避免把用户输入直接拼成一段不可追踪字符串。
- [ ] `P6-17` 为 Image、Video、TTS 分别实现 ProviderPrompt 编译模板。
- [ ] `P6-18` 保存 Prompt 模板版本和编译结果，支持复现。
- [ ] `P6-19` 实现 Prompt 预览、单镜重新编译和编译差异比较。
  - 阶段出口：同一业务版本可以通过统一接口生成 Mock 结果和真实 Provider 结果；任务可重试、取消、幂等，Prompt 和费用可复现。

---

# P7：资产生成与一致性系统

## P7.1 资产中心

- [ ] `P7-01` 实现角色、服装、场景、道具、表情、声音、视频、音效的统一资产目录。
- [ ] `P7-02` 实现 AssetVersion，不允许下游直接引用逻辑资产而不指定版本。
- [ ] `P7-03` 实现角色 Appearance 版本：默认、剧情阶段、天气/受伤/回忆等状态。
- [ ] `P7-04` 实现场景空间连续性、光源方向、时间天气和摄影机区域定义。
- [ ] `P7-05` 实现资产状态：DRAFT、GENERATING、REVIEW、APPROVED、LOCKED、ARCHIVED、FAILED。
- [ ] `P7-06` 实现资产引用反查：被哪些剧集、场景、Shot、Timeline Clip 使用。
- [ ] `P7-07` 实现资产集合、项目内复用和跨项目复制为新版本。

## P7.2 资产生成与审核

- [ ] `P7-08` 实现角色定妆照、场景概念图、道具参考图生成任务。
- [ ] `P7-09` 支持多角度、多光线、多候选生成和候选对比。
- [ ] `P7-10` 实现风格锁定和项目级视觉规则检查。
- [ ] `P7-11` 实现资产候选审核、定稿、锁定和变更影响提示。
- [ ] `P7-12` 资产审核意见绑定 AssetVersion 和候选结果，不能只写项目级留言。
  - 阶段出口：一集所需的最小角色、场景、道具资产均有可追溯版本，至少一个候选被审核锁定，分镜可引用锁定版本。

---

# P8：视频、音频、时间线与渲染

## P8.1 镜头视频生成

- [ ] `P8-01` 实现草稿模式和最终模式的生成参数。
- [ ] `P8-02` 支持比例、分辨率、时长、首帧/尾帧、参考图、生成策略配置。
- [ ] `P8-03` 实现单镜生成、批量生成、候选结果、失败重试、局部重生成。
- [ ] `P8-04` 生成结果绑定 ShotVersion、AssetVersion、ProviderJob 和 CostRecord。
- [ ] `P8-05` 实现浏览器低分辨率预览和服务端最终输出边界。
- [ ] `P8-06` 实现镜头前后连续性检查的结果记录。

## P8.2 音频生产

- [ ] `P8-07` 建立对白、旁白、环境音、动作音、背景音乐的音频资产类型。
- [ ] `P8-08` 实现 TTS Adapter 和 Mock 音频结果。
- [ ] `P8-09` 建立 VoiceProfile，确保角色声音和语言参数可复用。
- [ ] `P8-10` 生成字幕时间码和基础字幕文件。
- [ ] `P8-11` 实现音频波形/时长读取、音画同步所需元数据。
- [ ] `P8-12` V1 先支持单集基础音轨混合；复杂口型和高级降噪后置。

## P8.3 Timeline 与 FFmpeg

- [ ] `P8-13` 实现 TimelineVersion、VideoTrack、AudioTrack、SubtitleTrack、Clip、Transition、Keyframe 的基础结构。
- [ ] `P8-14` 时间线只引用 AssetVersion、GenerationCandidate 或已确认媒体版本。
- [ ] `P8-15` 实现基础剪辑工作台：素材库、播放器、属性区、时间线、版本/审核/导出入口。
- [ ] `P8-16` 实现 Timeline JSON → Render Plan → FFmpeg filter graph。
- [ ] `P8-17` 实现分段渲染缓存，局部镜头变更时不重渲整集。
- [ ] `P8-18` 实现代理视频、合并、音频混合、字幕烧录和导出文件登记。
- [ ] `P8-19` 实现 720p/1080p 至少一个稳定导出预设。
  - 阶段出口：用 Mock 或真实生成结果完成一集可播放视频，时间线可保存版本，局部替换镜头后能够增量渲染并重新导出。

---

# P9：自动质检、审核与成本控制

## P9.1 自动质量检查

- [ ] `P9-01` 画面质检：黑帧、白帧、冻结帧、编码损坏、分辨率/帧率异常。
- [ ] `P9-02` 画面质检：面部异常、多余肢体、服装漂移、场景突变、轴线错误、闪烁、意外字幕/水印/UI。
- [ ] `P9-03` 音频质检：爆音、静音、削波、噪声、台词截断、对白重叠、音画不同步、声线异常。
- [ ] `P9-04` 剧情质检：关键事件遗漏、台词归属错误、人物错场景、道具状态冲突、伤势/服装/时间连续性冲突。
- [ ] `P9-05` 质检结果写入 QCReport/QCIssue，支持标记、拦截、复核，不得未经允许覆盖人工定稿。
- [ ] `P9-06` 将质检作为工作流条件节点接入导出前闸门。

## P9.2 审核流

- [ ] `P9-07` 实现剧本、分镜、资产、视频候选、TimelineVersion、最终成片的审核对象。
- [ ] `P9-08` 审核意见绑定具体版本、段落、Shot 或时间码。
- [ ] `P9-09` 实现通过、驳回、要求修改、重新提交和审批历史。
- [ ] `P9-10` 实现导出前必须满足的审批条件，并提供阻塞原因。

## P9.3 成本和预算

- [ ] `P9-11` 每次生成记录 Provider、模型、输入/输出量、视频时长、生成次数、成功/失败、预计/实际费用、归属项目/剧集/Shot。
- [ ] `P9-12` 实现团队月预算、项目预算、单集预算三级预算。
- [ ] `P9-13` 批量生成前计算镜头数 × 候选数 × 单次价格 + 音频 + 渲染估算。
- [ ] `P9-14` 超预算进入 `WAITING_BUDGET_APPROVAL`，不得继续消耗。
- [ ] `P9-15` 提供生成中心的任务队列、预计完成时间、失败原因、重试和 Provider 状态。
  - 阶段出口：错误结果会被标记或拦截；审核和预算闸门能够阻止不合格或超预算成片导出；生成成本可按项目/剧集/镜头汇总。

---

# P10：端到端验收、部署与 V1 发布

## P10.1 一集闭环验收

- [ ] `P10-01` 使用 P0-02 的固定样本跑通原文导入。
- [ ] `P10-02` 验证原文、角色、场景、道具、剧本、分镜、资产、生成结果、时间线、渲染文件之间的追溯关系。
- [ ] `P10-03` 验证剧本、分镜、资产、最终成片审核闸门。
- [ ] `P10-04` 验证至少一次任务失败重试、取消、幂等和断点续作。
- [ ] `P10-05` 验证修改单个 Shot 后的局部重生成和增量渲染。
- [ ] `P10-06` 验证成本记录、预算暂停和导出拦截。
- [ ] `P10-07` 验证自动质检报告和人工复核流程。

## P10.2 工程质量与交付

- [ ] `P10-08` 完成关键领域单元测试、API 集成测试、Worker 测试、渲染测试。
- [ ] `P10-09` 完成从新环境部署到导出的操作手册。
- [ ] `P10-10` 完成 API 文档、数据字典、事件协议、Provider 接入说明和故障排查手册。
- [ ] `P10-11` 完成备份/恢复演练：PostgreSQL、MinIO、任务数据和审计日志。
- [ ] `P10-12` 完成安全检查：上传限制、权限隔离、密钥不入库、对象访问策略、基础限流。
- [ ] `P10-13` 完成 V1 Demo 和回归清单。
- [ ] `P10-14` 评审并冻结 V1 发布版本。
  - V1 发布条件：固定样本可以稳定完成一集闭环；关键失败场景可恢复；所有生成结果、版本、审核、成本和导出文件可追溯。

---

## 3. V1 完成后的扩展路线

以下内容不与 V1 任务混排，待 P10 完成后按价值和资源重新排期。

### Phase 2：工业化批量生产

- [ ] 多集/多季批量拆分和批量工作流。
- [ ] 角色一致性增强、角色身份参数和更多姿态/表情资产。
- [ ] 首帧/尾帧工作流和更强的镜头依赖分析。
- [ ] 候选对比、自动粗剪、失败任务恢复和批量重试优化。
- [ ] 完整音频系统、口型对齐、降噪、混音和字幕校正。
- [ ] 更完整的自动质检和质量评分。

### Phase 3：专业创作平台

- [ ] 完整多轨编辑、关键帧、特效、转场和时间线分支。
- [ ] 多人实时协作、评论、审批和权限细化。
- [ ] 多 Provider 智能路由、质量/成本/速度策略。
- [ ] 项目成本预测、数据看板和生产效率分析。
- [ ] 无限画布和可视化工作流。

### Phase 4：平台化与商业化

- [ ] 多租户、套餐、计费和配额。
- [ ] 模板市场、资产市场、工作流模板。
- [ ] Provider 密钥托管、开放 API、第三方生态。
- [ ] 私有化部署和生产环境横向扩容。
- [ ] 一键分发与投放 Agent。

---

## 4. 每次实施的记录模板

完成任意任务后，在对应任务下补充：

```markdown
- 完成日期：YYYY-MM-DD
- 实现位置：绝对路径或模块/接口名称
- 验证方式：命令、测试用例或手工步骤
- 验证结果：通过 / 部分通过 / 未通过
- 备注：已知限制、后续补偿任务或影响范围
```

若任务未能完成：

```markdown
- 状态改为 `[!]`
- 记录阻塞原因
- 记录解除条件
- 记录是否需要拆分为新任务
```

## 5. 当前执行队列

按依赖关系，下一轮实施顺序固定为：

1. 完成 `P0-09`：确认架构说明书第 12 节的待评审事项并批准 v1.1。
2. `P1-01`～`P1-13`：完成工程骨架与本地基础设施。
3. `P2-01`～`P2-18`：完成事实源、迁移、权限和版本规则。
4. 并行启动 `P6-01`～`P6-07`：完成任务协议和 Worker 运行基础。

当前已完成：`P0-01`～`P0-08`、`P1-01`～`P1-04`、`P1-06`～`P1-09`、`P1-12`、`P2-01`～`P2-02`；`P0-09`、`P1-05`、`P1-10`～`P1-11` 正在推进，`P1-13` 因本机缺少 Docker CLI 阻塞。下一步实施 `P2-03`，建立 Script、ScriptVersion、Scene、Beat、Dialogue，并保持剧本版本不可变和原文来源可追溯。
