# AI漫剧创作平台

本仓库正在按 `AI漫剧创作平台实施计划.md` 分阶段建设。

## 当前状态

- V1 测试样本：`V1测试样本_雨夜的灯.md`
- 架构说明书：`AI漫剧平台架构说明书v1.1.md`
- 实施计划：`AI漫剧创作平台实施计划.md`
- 当前阶段：P1 工程与基础设施
- 当前完成项：P0-01～P0-08、P1-01～P1-04、P1-06～P1-09；P0-09、P1-05、P1-10～P1-12 推进中；P1-13 因 Docker CLI 缺失阻塞

## 目录

```text
web/                 Vue 前端占位
api/                 NestJS 控制平面占位
workers/             Python Worker 占位
packages/contracts/  跨服务契约占位
infra/               Docker Compose、Nginx、数据库初始化
 tests/              测试目录
 docs/               补充设计和运行文档
```

## 当前环境说明

当前工作区已创建工程骨架和本地依赖配置。CI 使用 Node.js 22、Python 3.13 和 `npm ci`，仓库必须提交根目录 `package-lock.json`。本机如果未安装 Docker CLI，则不能执行 Docker Compose 健康检查。安装 Docker Desktop 后执行：

```powershell
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up --build
```