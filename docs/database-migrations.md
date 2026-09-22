# 数据库迁移、种子数据与回滚手册

本手册适用于 `api/prisma/schema.prisma` 与 `api/prisma/migrations/` 中的 PostgreSQL 数据库变更。迁移是发布物的一部分：已在共享环境或生产环境应用的历史迁移**不得修改、重命名或删除**。

## 1. 前置条件与安全边界

1. 使用 Node.js 22 和已提交的根目录 `package-lock.json` 执行 `npm ci`。
2. 目标 PostgreSQL 必须可达；本地可使用 `infra/docker-compose.yml` 中的 `postgres` 服务。
3. 在共享或生产环境开始前，确认变更窗口、停止条件、负责人和可用备份。先完成数据库备份并验证能恢复，再执行 Schema 迁移。
4. `DATABASE_URL` 是敏感配置。仅通过环境变量或受控密钥管理注入，不提交到 Git。
5. `migrate deploy` 只应用仓库中已提交的迁移；生产环境禁止使用 `prisma migrate dev`、`db push` 或重置数据库。

PowerShell 示例连接串：

```powershell
$env:DATABASE_URL = "postgresql://comicdrama:change-me@localhost:5432/comicdrama?schema=public"
```

## 2. 本地迁移流程

在仓库根目录执行：

```powershell
npm ci
docker compose -f infra/docker-compose.yml up -d postgres
$env:DATABASE_URL = "postgresql://comicdrama:change-me@localhost:5432/comicdrama?schema=public"
npm run prisma:validate --workspace api
npm run prisma:migrate:deploy --workspace api
npm run prisma:migrate:status --workspace api
npm run prisma:seed --workspace api
```

期望结果：

- `prisma:validate` 成功，说明 Prisma Schema 可以解析；
- `prisma:migrate:deploy` 成功，说明所有尚未应用的迁移已执行；
- `prisma:migrate:status` 显示迁移历史与本地迁移目录一致；
- `prisma:seed` 输出 `seed-rainy-night-lamp` 及关联记录计数。

`api/prisma/seed.js` 使用固定 UUID 和 `upsert`；重复执行会确认同一批演示记录，不会清空数据库或创建第二个种子项目。种子数据仅用于本地开发、测试和受控演示环境，不得作为生产业务数据或身份/权限初始化机制。

## 3. 生产发布流程

1. 将迁移 SQL 与应用变更一并 Code Review；确认 Schema 变更、应用写入代码和数据库备份策略一致。
2. 在预发布环境执行一次与生产同版本的 `migrate deploy`、应用健康检查和关键查询验证。
3. 生产开始前暂停会写入受影响表的后台任务；对于长时间数据回填，先估算锁表、运行时间和失败恢复时间。
4. 创建并验证 PostgreSQL 备份。对象存储和数据库具有追溯关系时，一并记录对应对象存储备份点。
5. 使用最小权限的发布账户执行：

   ```powershell
   npm ci
   $env:DATABASE_URL = "<由受控密钥注入的生产连接串>"
   npm run prisma:validate --workspace api
   npm run prisma:migrate:deploy --workspace api
   npm run prisma:migrate:status --workspace api
   ```

6. 重新启用应用与 Worker，验证健康检查、错误日志、关键项目范围查询和新写入路径。
7. 记录发布版本、迁移列表、备份标识、执行人和验证结果。生产环境通常不运行演示种子数据；若确有受控演示库需求，应单独审批后执行。

## 4. P2-12 回填型迁移的特别检查

`20260921000200_core_table_governance` 为 `Episode`、`Script`、`Shot` 和 `Timeline` 增加直接、非空的 `projectId`，并按以下链路回填：

```text
Season → Episode → Script → Shot
              └──────────→ Timeline
```

该迁移在设置 `NOT NULL` 和外键前主动检查未回填记录；任何一类记录缺少项目归属都会中止迁移。**不要**通过修改历史 SQL、删除检查语句、手工将迁移标记为已应用等方式跳过这一保护。

在受控环境完成迁移后，可使用只读 SQL 核对项目归属：

```sql
SELECT 'episodes' AS table_name, count(*) AS missing_project_id
FROM episodes
WHERE "projectId" IS NULL
UNION ALL
SELECT 'scripts', count(*)
FROM scripts
WHERE "projectId" IS NULL
UNION ALL
SELECT 'shots', count(*)
FROM shots
WHERE "projectId" IS NULL
UNION ALL
SELECT 'timelines', count(*)
FROM timelines
WHERE "projectId" IS NULL;
```

期望四行的 `missing_project_id` 均为 `0`。还应抽样检查每条记录的 `projectId` 与其父级链路所属项目一致。

## 5. 种子数据内容与验证

种子项目 slug 固定为 `seed-rainy-night-lamp`，以 `V1测试样本_雨夜的灯.md` 为题材，建立最小可追溯链：

```text
Project → Season → Episode
        → SourceDocument → SourceDocumentVersion → SourceSegment
        → Script → ScriptVersion → Scene → Beat → Dialogue → Shot → ShotVersion
        → Asset → AssetVersion → Timeline → TimelineVersion → Track → Clip
        → Workflow → WorkflowRun → Task → TaskAttempt
        → Generation → ProviderJob → GenerationCandidate
        → Review → ReviewComment / Approval
        → ExportPreset → RenderJob → RenderSegment
        → UsageRecord → CostRecord
        → AuditLog
```

种子中的 `Episode`、`Script`、`Shot`、`Timeline` 均写入相同的项目 UUID，专门覆盖 P2-12 引入的直接项目归属字段。它只登记示例对象存储键，不上传任何文件、不调用真实 Provider，也不含密钥。

要验证幂等性，在隔离数据库中连续执行两次：

```powershell
npm run prisma:seed --workspace api
npm run prisma:seed --workspace api
```

两次均应成功，且种子项目仍只有一个。可在 Prisma Studio 或数据库客户端验证 `projects.slug = 'seed-rainy-night-lamp'` 的关联记录；不要在共享或生产库中把“清空再重建”作为幂等性验证方式。

## 6. 失败处理与停止条件

立即停止迁移、保留命令输出并通知发布负责人，当出现下列任何情况：

- 备份未完成、备份不可恢复或目标数据库身份不明确；
- `migrate deploy` 失败，或 `migrate status` 显示迁移历史不一致；
- P2-12 回填检查失败或项目归属抽查不一致；
- Schema 迁移虽成功但应用无法启动、健康检查失败或关键写入/查询报错；
- 迁移耗时、锁等待或数据库负载超过发布窗口预先约定的阈值。

优先收集 `prisma migrate status`、数据库日志、应用 traceId、迁移目录名和备份标识。不要在未理解失败原因前重复执行破坏性命令。

`prisma migrate resolve` 仅用于迁移确已由受控人工操作完成、需要同步 Prisma 迁移历史的场景，并必须记录审批、实际 SQL、备份标识和复核人。它不是跳过失败迁移、掩盖漂移或替代数据修复的工具。

## 7. 回滚策略

Prisma `migrate deploy` 不提供安全的“一键回滚”。回滚必须按环境和数据影响选择以下方式。

### 未发布迁移

若迁移从未进入共享环境，可在本地分支中修正或删除它，再重新生成迁移。不要改动已经推送、已经部署或可能被其他环境应用的迁移。

### 可丢弃的个人开发数据库

仅在确认数据库数据可丢失时，可停止本地服务、删除并重建本地数据库后重新执行 `migrate deploy` 和 `prisma:seed`。该方式禁止用于共享、预发布或生产数据库。

### 共享环境与生产数据库

1. 停止相关写入、创建并验证备份；必要时先将应用切回兼容旧 Schema 的版本。
2. 评估是否只需应用层回退：当新增列/索引对旧应用无害时，优先保留 Schema，避免不必要的数据损失。
3. 必须撤销 Schema 时，新增一个**补偿迁移**，按依赖的反向顺序删除新代码不再使用的约束、索引、列或表；绝不直接编辑已应用的历史迁移。
4. 数据需要恢复时，从已验证备份恢复，或让补偿迁移保留仍有业务价值的数据。不可变版本、审批、用量、成本和审计记录不能用原地更新伪造“回到过去”。
5. 执行补偿迁移、验证应用和数据后，才在确有必要时使用 `migrate resolve` 同步迁移历史。

### P2-12 的专用补偿顺序

仅当已确认应用代码不再读取直接 `projectId`、版本号、归档字段或新增更新时间，且已完成备份时，才可编写 P2-12 的补偿迁移。推荐顺序：

1. 停止对 `episodes`、`scripts`、`shots`、`timelines` 及相关业务表的写入；
2. 删除依赖直接 `projectId` 的外键与复合索引；
3. 验证没有新代码依赖项目范围查询，再删除相应列；
4. 再按实际影响删除新增的 `version`、`archivedAt`、`updatedAt` 字段及其索引；
5. 恢复前一版应用，执行数据完整性与健康检查；
6. 将补偿迁移、备份标识和验证结果记录在发布记录中。

在生产环境执行前，必须先在同版本数据副本上演练该补偿迁移。不要把本文的顺序复制为未审查的生产 SQL；实际约束名称、数据量和应用依赖都需要由发布负责人复核。

## 8. 迁移后通用验证

```powershell
npm run prisma:validate --workspace api
npm run prisma:migrate:status --workspace api
npm run prisma:seed --workspace api
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build --workspace web
npm run build --workspace api
git diff --check
```

Worker 相关检查仍必须使用 `workers/.venv` 中的 Python 3.13：

```powershell
cd workers
.venv\Scripts\activate
ruff check src tests
pytest -p no:cacheprovider tests
python -m compileall -q src
cd ..
```
