# 本地开发说明

## 前置环境

- Node.js 22（与 CI 保持一致）
- Python 3.13 或更高版本
- Docker Desktop（用于 PostgreSQL、Redis、MinIO 和容器化服务）

## 安装依赖

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

当前 Worker 没有第三方运行依赖。后续进入 P6、P8 后，按 Worker 能力补充依赖并锁定版本。

## 启动前端

```powershell
npm run dev --workspace web
```

## 启动 API

```powershell
npm run start:dev --workspace api
```

健康检查：

```text
GET http://localhost:3000/api/health
```

## 启动基础设施

```powershell
docker compose -f infra/docker-compose.yml up --build
```

当前机器如果未安装 Docker CLI，只能完成静态配置检查，不能执行容器健康检查。