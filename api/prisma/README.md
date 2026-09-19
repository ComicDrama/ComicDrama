# Prisma 数据模型

## 当前迁移

- `20260919000100_init_project_hierarchy` 对应实施计划中的 `P2-01`，建立 `projects`、`seasons`、`episodes`。
- `20260919000200_source_documents` 对应实施计划中的 `P2-02`，建立 `source_documents`、`source_document_versions`、`source_segments`。
- `20260919000300_script_models` 对应实施计划中的 `P2-03`，建立剧本、场景、节拍和对白事实源。
- `20260919000400_shot_models` 对应实施计划中的 `P2-04`，建立镜头、镜头版本、镜头依赖和分镜面板。
- `20260919000500_asset_models` 对应实施计划中的 `P2-05`，建立逻辑资产、不可变资产版本、资产集合和下游引用。

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
npx prisma migrate deploy --schema api/prisma/schema.prisma
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
