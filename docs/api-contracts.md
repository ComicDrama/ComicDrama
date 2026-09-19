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
