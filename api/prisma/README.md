# Prisma 数据模型

## 当前迁移

- `20260919000100_init_project_hierarchy` 对应实施计划中的 `P2-01`，建立 `projects`、`seasons`、`episodes`。
- `20260919000200_source_documents` 对应实施计划中的 `P2-02`，建立 `source_documents`、`source_document_versions`、`source_segments`。
- `20260919000300_script_models` 对应实施计划中的 `P2-03`，建立剧本、场景、节拍和对白事实源。
- `20260919000400_shot_models` 对应实施计划中的 `P2-04`，建立镜头、镜头版本、镜头依赖和分镜面板。
- `20260919000500_asset_models` 对应实施计划中的 `P2-05`，建立逻辑资产、不可变资产版本、资产集合和下游引用。
- `20260919000600_character_location_prop_models` 对应实施计划中的 `P2-06`，建立角色、角色外观、声音配置、场景版本、场景连续性和道具。
- `20260919000700_generation_provider_models` 对应实施计划中的 `P2-07`，建立生成请求、生成候选和 Provider 异步任务。
- `20260919000800_workflow_task_models` 对应实施计划中的 `P2-08`，建立工作流定义、运行实例、任务事实源和任务尝试记录。
- `20260919154745_timeline_models` 对应实施计划中的 `P2-09`，建立时间线、时间线不可变版本、轨道、片段、转场和关键帧。
- `20260919161159_review_render_models` 对应实施计划中的 `P2-10`，建立审核、审批、渲染任务、分段渲染和导出预设。
- `20260921000100_usage_cost_audit_models` 对应实施计划中的 `P2-11`，建立用量、成本和追加式审计事实源。
- `20260921000200_core_table_governance` 对应实施计划中的 `P2-12`，补齐核心聚合根治理字段、项目查询路径和生命周期索引。
- `20260922000100_access_control_models` 对应实施计划中的 `P2-14`，建立 `users`、`teams`、`team_members`、`project_members`、`project_teams` 以及通用项目访问级别。

迁移执行、种子数据、失败处理与回滚边界见 [docs/database-migrations.md](../../docs/database-migrations.md)（实施计划 P2-13）。

## P2-14 用户、团队与项目访问

`20260922000100_access_control_models` 增加：

- `User` 与 `Team`：可归档的用户和团队聚合根，分别以 email 和 slug 唯一标识。
- `TeamMember`：表达团队成员生命周期和团队管理员标志，不直接等同于项目权限。
- `ProjectMember`：表达用户对项目的直接访问关系。
- `ProjectTeam`：表达团队对项目的访问关系。
- `VIEW`、`EDIT`、`MANAGE`：通用项目访问级别，后续业务角色在 P2-15 建立。

P2-14 只建立关系和通用访问级别；Owner、Producer 等业务角色由 P2-15 建立，API 权限守卫和资源级访问检查由 P2-16 建立。API 不能仅凭前端传入的 `projectId` 信任权限，必须在服务端验证用户、团队、成员状态和项目访问级别。
P2-01 的三个实体均使用 UUID 主键、状态枚举、版本号、创建/更新时间和归档时间；Season 与 Episode 的编号在各自父级范围内唯一。P2-02 的原文版本不可变，原始文件存放在 MinIO/S3，数据库保存元数据、对象存储键和规范化文本。

## 环境变量

设置 PostgreSQL 连接串：

```powershell
$env:DATABASE_URL = "postgresql://comicdrama:change-me@localhost:5432/comicdrama?schema=public"
```

## 常用命令

在仓库根目录执行：

```powershell
npm ci
npm run prisma:validate --workspace api
npm run prisma:migrate:deploy --workspace api
npm run prisma:migrate:status --workspace api
npm run prisma:seed --workspace api
```

开发环境需要创建新迁移时，使用 `prisma migrate dev`，不要直接修改已经提交的迁移文件。

## P2-02 原文事实源

`20260919000200_source_documents` 增加：

- `SourceDocument`：项目级原文逻辑文档。
- `SourceDocumentVersion`：不可变导入版本，保存哈希、对象存储路径、解析状态和解析器信息。
- `SourceSegment`：章节、段落等可定位片段，保存字符偏移、行号和父子层级。

`currentVersionId` 只是逻辑文档的当前版本指针；历史版本和片段不会被原地覆盖。原始文件存放在 MinIO/S3，`storageKey` 保存对象路径；`textContent` 保存供检索和追溯使用的规范化文本。

## P2-03 剧本事实源

`20260919000300_script_models` 增加：

- `Script`：单集逻辑剧本，维护当前版本指针。
- `ScriptVersion`：不可变剧本版本，记录父版本、来源原文版本、改编模式、状态和变更摘要。
- `Scene`：同一时间/地点下的戏剧场景，按剧本版本排序。
- `Beat`：场景内的叙事动作、信息揭示或情绪变化。
- `Dialogue`：场景内的对白，支持说话人、对白类型、语气和 Beat 归属。

Scene、Beat、Dialogue 均可保存 `SourceSegment` 引用；下游内容通过具体 `ScriptVersion` 追溯，不直接依赖会变化的逻辑剧本对象。已被下游引用的版本不得原地修改，修改应创建新的 `ScriptVersion` 并记录 `parentVersionId`。

## P2-04 分镜事实源

`20260919000400_shot_models` 增加：

- `Shot`：Beat 下的逻辑镜头，维护当前版本指针和镜头顺序。
- `ShotVersion`：不可变镜头设计版本，记录具体剧本版本、父版本、时长、景别、机位、运动、动作、连续性和生成策略。
- `ShotDependency`：镜头之间的连续性、匹配剪辑、承接和参考依赖。
- `StoryboardPanel`：镜头版本的分镜面板及对象存储元数据。

Shot 和 ShotVersion 均追溯到具体 `ScriptVersion`，ShotVersion 可引用 `SourceSegment`；角色、场景和道具的具体资产引用字段先以 JSON 保存，待后续资产模型完成后再建立强类型关联。

## P2-05 资产事实源

`20260919000500_asset_models` 增加：

- `Asset`：可复用的逻辑资产，支持项目资产和跨项目共享资产，并维护当前版本指针。
- `AssetVersion`：不可变资产版本，记录父版本、对象存储键、SHA-256、MIME、尺寸、时长和生成元数据；已被引用的版本不得原地修改。
- `AssetCollection` / `AssetCollectionItem`：项目级或共享资产库及其成员，可选固定到具体资产版本。
- `AssetReference`：以 `assetVersionId` 固定下游使用的资产版本；`targetType`/`targetId` 支持 `SHOT_VERSION`、`CHARACTER`、`LOCATION`、`PROP` 等多态目标，当前已对 `ShotVersion` 建立外键。

数据库只保存资产元数据、哈希和对象存储 key，大文件进入 MinIO/S3；PostgreSQL 保存资产版本、集合和引用事实。

## P2-06 角色、场景、道具与连续性事实源

`20260919000600_character_location_prop_models` 增加：

- `Character`：项目级或共享角色卡，保存身份、性格、外貌、服装、别名和当前外观指针。
- `CharacterAppearance`：角色正面、侧面、背面、表情、姿态和服装等外观记录，固定引用具体 `AssetVersion`。
- `VoiceProfile`：角色声音供应商、声音 ID、语言、地区、音高、语速和风格配置，可选引用声音样本 `AssetVersion`。
- `Location` / `LocationVersion`：场景逻辑实体和不可变场景版本，保存空间布局、光照、时间、天气、连续性规则和参考资产版本。
- `SceneContinuity`：将角色、场景、道具在具体剧本场次中的状态记录为有序快照，支持伤势、服装、道具状态和环境变化追踪。
- `Prop`：项目级或共享道具卡，可关联逻辑资产和当前资产版本。

角色、场景和道具的视觉文件仍由 `Asset` / `AssetVersion` 管理；数据库只保存结构化设定、版本指针和对象存储元数据。`SceneContinuity.subjectType` 与对应外键字段的业务一致性由 API 层校验，后续将在实体 API 和质检规则中强化。

## P2-07 生成事实源与 Provider 任务

`20260919000700_generation_provider_models` 增加：

- `Generation`：一次面向资产、角色、场景或镜头的生成请求，保存输入版本快照、编译后的 Prompt、Provider/模型、参数、种子、成本和最终选中的候选。
- `GenerationCandidate`：同一生成请求下的候选结果，保存结果文件元数据、对象存储 key、哈希、尺寸、时长、Provider 输出 ID 和失败信息；人工选定后可关联 `AssetVersion`。
- `ProviderJob`：Provider 侧异步任务事实源，保存外部任务 ID、幂等键、请求/响应归档、轮询状态、重试父子谱系和候选关联。

`Generation.targetType` / `targetId` 用于支持 `SHOT_VERSION`、`CHARACTER`、`LOCATION`、`PROP` 等多态生成目标；API 层必须校验目标存在、项目归属和输入版本一致性。Provider 原始请求/响应允许归档在数据库 JSON 字段中，生产环境的大型结果文件仍只进入 MinIO/S3。

## P2-08 工作流与任务事实源

`20260919000800_workflow_task_models` 增加：

- `Workflow`：版本化工作流定义和项目归属。
- `WorkflowRun`：工作流运行快照、上下文、结果、状态和 traceId。
- `Task`：任务事实源，保存任务类型、业务资源、输入版本、幂等键、优先级、重试参数、锁定信息、心跳和结果。
- `TaskAttempt`：每次 Worker 执行尝试的状态、输入输出、错误、可重试标记和心跳。

Task 的 `resourceType` / `resourceId` 支持关联生成、导入、编译、渲染等多类业务资源；`idempotencyKey` 全局唯一以支持幂等创建。Redis Streams 只作为派发通道，任务状态和尝试记录以 PostgreSQL 为事实源，具体消费和恢复策略在 P6 实现。

## P2-09 时间线事实源

`20260919154745_timeline_models` 增加：

- `Timeline`：单集剪辑时间线逻辑实体，维护状态、版本号和当前版本指针。
- `TimelineVersion`：不可变时间线版本，保存父版本、帧率基准（`timebase`）、总帧数和版本状态。时间位置统一使用整数帧，不使用浮点秒。
- `Track`：时间线版本内的 Video、Audio、Subtitle 轨道，保存排序、锁定、静音和音量属性。
- `Clip`：轨道内的片段，保存时间线起点、片段时长、源素材入出点、播放速率、变换和特效；片段可引用固定的 `AssetVersion` 或 `GenerationCandidate`。
- `Transition`：连接同一时间线版本中前后两个片段，保存转场类型、起始帧、时长和参数。
- `Keyframe`：片段属性在指定帧的值，支持位置、缩放、旋转、不透明度、音量、调色等属性及 step/linear/bezier 插值。

数据库层通过外键、版本唯一约束和常用查询索引保证引用完整性与版本追溯。`Clip.sourceType` 与两个可选引用字段的一致性、同轨道片段重叠、转场范围及时间线帧范围由后续 API/Render Plan 校验。

## P2-10 审核与渲染事实源

`20260919161159_review_render_models` 增加：

- `Review`：项目范围内的审核实例，使用 `targetType`/`targetId` 指向剧本版本、分镜版本、资产版本、时间线版本、渲染任务或媒体对象，并记录审核轮次、状态、摘要和提交/完成时间。
- `ReviewComment`：审核意见，固定归属一个 Review，可选记录作者、字段路径、时间码帧、处理状态和解决人；时间线/视频评论使用整数帧而不是浮点秒。
- `Approval`：审核审批记录，保存审批人、角色、决策、说明和决策时间；不覆盖历史记录，支持同一审核的多次审批留痕。
- `RenderJob`：一次基于 `TimelineVersion` 和 `ExportPreset` 的渲染任务事实源，保存幂等键、状态、输出对象存储键、媒体元数据、错误和生命周期时间。
- `RenderSegment`：渲染任务的分段执行记录，保存分段序号、帧范围、缓存键、输出对象存储键、状态和错误，支持局部渲染、分段缓存和增量导出。
- `ExportPreset`：系统级或项目级导出预设，保存容器、音视频编码、分辨率、帧率、码率、音频采样率、画幅和默认标记。

审核对象采用多态目标字段，目标存在性、项目归属、版本状态和 Reviewer/Director 审批角色由 API 层校验。`RenderJob` 必须引用不可变的 `TimelineVersion`；渲染产物和分段文件进入 MinIO/S3，PostgreSQL 只保存对象存储键、哈希/媒体元数据和可追溯状态。`startFrame`、`endFrame`、`timecodeFrame` 的范围关系以及导出前审批闸门将在后续 P6/P9/P10 实施。

## P2-11 用量、成本与审计事实源

`20260921000100_usage_cost_audit_models` 增加：

- `UsageRecord`：不可变用量事实，记录 Provider、生成或渲染所消耗的请求数、输入/输出 Token、图片数、音视频时长、渲染帧、计算时长或存储字节；可关联项目、Generation、ProviderJob、RenderJob 和通用资源目标。
- `CostRecord`：独立的成本账目，支持预计、已计提、退款和作废状态，保存计费类别、Provider/模型、数量、单价、金额、币种和发生时间；可由具体 UsageRecord 派生，也可直接关联生成或渲染任务。
- `AuditLog`：追加式关键操作审计记录，保存操作者、动作、实体类型/ID、requestId、traceId、变更前后快照和上下文元数据；项目关系使用 `SetNull`，保留已归档或删除资源的审计轨迹。

用量、成本与审计均以 PostgreSQL 为事实源。货币金额和可计量数量使用定点 `Decimal`，不使用浮点金额；Provider 原始请求/响应仍由既有 `ProviderJob` 归档。应用层在 P2-14～P2-17 接入用户、团队、资源权限和关键操作写入；预算闸门、成本汇总与导出前拦截在 P9/P10 实施。

## P2-12 核心表治理策略

`20260921000200_core_table_governance` 将 Episode、Script、Shot 和 Timeline 的项目归属固化为非空 `projectId`，使常用的项目范围查询不再依赖跨多级关系连接。迁移按 Season → Episode → Script → Shot/Timeline 链路回填已有数据；回填后才施加非空约束和项目外键。写入 API 必须在同一事务中从父实体继承 `projectId`，并在 P2-16 的资源级权限检查中拒绝项目不一致的关联。

治理字段按记录性质分层：

- 逻辑聚合根（项目、剧集、原文、剧本、镜头、角色、场景、道具、资产、资产集合、工作流、时间线和导出预设）保留 `createdAt`、`updatedAt`、`version`，并以 `archivedAt` 归档替代物理删除；`version` 用作乐观并发控制计数，API 更新时须同时匹配旧值并递增。
- 可变运行记录（TaskAttempt、Generation、GenerationCandidate、ProviderJob、RenderJob、RenderSegment、Review 和 ReviewComment）记录 `updatedAt`，以便恢复、重试和状态追踪。
- 版本快照、引用边和账本/审计记录是不可变或追加式事实：SourceDocumentVersion、ScriptVersion、ShotVersion、LocationVersion、AssetVersion、TimelineVersion、Approval、UsageRecord、CostRecord 和 AuditLog 不做软删除，也不以 `updatedAt` 覆盖历史。需要修正时创建新的版本、审批、成本冲销或审计事件。
- `Asset`、`AssetCollection`、`Character`、`Location`、`Prop` 和 `ExportPreset` 的 `projectId` 仍允许为空，表示受治理的全局共享资源；所有业务查询必须显式选择“当前项目资源”或“全局共享资源”。

新增的复合索引覆盖项目 + 状态/归档时间的列表、治理和清理查询；现有按父级、版本、状态和时间的索引继续用于追溯链与 Worker 查询。该迁移包含回填失败即中止的检查，避免在项目归属不完整时静默提交。
