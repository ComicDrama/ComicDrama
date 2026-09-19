# AI漫剧创作平台

本仓库按 [`AI漫剧创作平台实施计划.md`](AI漫剧创作平台实施计划.md) 分阶段建设，目标是形成一条可版本化、可审核、可回退、可批量生产的漫剧生产链路：

> IP 内容库 → 剧本工程 → 分镜工程 → 数字资产库 → 镜头生产线 → 音频生产线 → 多轨剪辑工程 → 渲染交付

## 当前状态

- V1 固定测试样本：`V1测试样本_雨夜的灯.md`
- 架构说明：`AI漫剧平台架构说明书v1.1.md`
- 实施计划：`AI漫剧创作平台实施计划.md`
- 已完成：`P0-01`～`P0-09`、`P1-01`～`P1-13`、`P2-01`～`P2-10`
- 当前阶段：P2 核心数据模型与迁移；下一项为 `P2-11`（UsageRecord、CostRecord、AuditLog）
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

详细字段、迁移约束和后续业务校验见 [`api/prisma/README.md`](api/prisma/README.md)。
