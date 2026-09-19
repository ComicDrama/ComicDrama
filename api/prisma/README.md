# Prisma 数据模型

## 当前迁移

- `20260919000100_init_project_hierarchy` 对应实施计划中的 `P2-01`，建立 `projects`、`seasons`、`episodes`。
- `20260919000200_source_documents` 对应实施计划中的 `P2-02`，建立 `source_documents`、`source_document_versions`、`source_segments`。

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
