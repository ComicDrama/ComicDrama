# API 与跨服务契约

## API 响应

成功响应：

```json
{
  "data": {},
  "meta": { "traceId": "trace_xxx" }
}
```

错误响应：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请求参数无效",
  "traceId": "trace_xxx",
  "details": {}
}
```

## 当前端点

- `GET /api/health`：服务健康状态。
- `GET /api/version`：服务版本和能力列表。

## 任务契约

TypeScript 类型位于 `packages/contracts/src/task.ts`、`api.ts` 和 `provider.ts`。Python Worker 对应类型位于 `workers/src/common/protocol.py`。

## 日志与错误上报

API 和 Worker 每行输出一个 JSON 日志对象，字段约定如下：

- `timestamp`：UTC ISO-8601 时间。
- `level`：`INFO` 或 `ERROR`。
- `service`：服务名。
- `traceId`：请求或任务链路标识。
- `taskId`：可选的任务标识。
- `event`：稳定的事件名，例如 `http.request.completed`。
- `errorCode`：可选错误码。
- `message`：可选的人类可读信息。
- `metadata`：可选的结构化扩展字段。

API 会为每个请求生成或透传 `x-trace-id`，并在请求完成和异常时输出结构化日志。Worker 使用相同字段约定输出启动、停止及任务事件。完整任务重试、心跳和前端状态推送仍属于 P6 任务协议范围。

## 访问控制（P2-16）

受保护的项目接口使用 `ProjectAccessGuard`，通过 `@ProjectAccess(...)` 声明最低项目访问级别和可选业务角色。守卫从路由参数、查询参数或请求体读取 `projectId`，随后在服务端检查：

1. 用户是否为 `ACTIVE` 状态；
2. 用户是否具有 `ACTIVE` 的直接项目成员关系；
3. 用户是否通过 `ACTIVE` 的团队成员关系继承项目团队授权；
4. `VIEW`、`EDIT`、`MANAGE` 访问级别是否满足接口要求；
5. 指定业务角色是否存在于直接成员或团队角色分配中。

当前阶段使用 `x-user-id` 作为受信任身份适配层的输入。生产部署必须由已认证的 API 网关或后续身份认证中间件覆写此请求头，不能把客户端任意提交的用户 ID 当作身份凭据。

示例保护接口：

```text
GET /api/projects/:projectId/access-check
x-user-id: <active-user-uuid>
```

未认证返回 `401`，缺少项目范围或无权访问返回 `403`。项目授权决策不得由前端传入的 `projectId` 或访问级别直接决定。

## 审计记录（P2-17）

关键业务接口可以使用 `@AuditAction(...)` 声明审计动作，由全局 `AuditLogInterceptor` 在接口成功完成后追加写入 `AuditLog`。支持的动作包括：

- `IMPORT`：导入原文或外部数据；
- `GENERATE`：提交或执行生成任务；
- `UPDATE`：修改业务资源；
- `REVIEW`：提交审核、通过、驳回或要求修改；
- `LOCK`：锁定资源或版本；
- `EXPORT`：导出媒体或项目文件；
- `DELETE` / `ARCHIVE`：删除或归档资源。

示例：

```typescript
@AuditAction({
  action: 'EXPORT',
  entityType: 'RenderJob',
  entityIdParam: 'renderJobId',
  projectIdParam: 'projectId',
})
@Post(':projectId/render-jobs/:renderJobId/export')
export(projectId: string, renderJobId: string) {
  // 成功返回后自动写入 AuditLog。
}
```

每条记录至少保存动作、实体类型，并尽可能保存项目 ID、实体 ID、操作者 ID、操作者类型、`x-request-id`、`x-trace-id`/响应 traceId 和 HTTP 请求元数据。需要保存变更前后快照时，由业务服务调用 `AuditLogService.recordRequestAction` 显式传入 `before` 和 `after`；默认不自动记录请求体，避免把密码、令牌或 Provider 密钥写入审计日志。审计写入失败不会静默忽略，已声明审计的接口会返回失败，从而避免业务成功但审计缺失。
