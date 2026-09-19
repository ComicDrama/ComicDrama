# Prisma 数据模型

## 当前迁移

`20260919000100_init_project_hierarchy` 对应实施计划中的 `P2-01`，只建立：

- `projects`
- `seasons`
- `episodes`

三个实体均使用 UUID 主键、状态枚举、版本号、创建/更新时间和归档时间；Season 与 Episode 的编号在各自父级范围内唯一。

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
