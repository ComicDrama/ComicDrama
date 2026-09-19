# Redis Streams 命名约定

Redis 只用于任务派发、锁、缓存和实时事件；任务状态事实存于 PostgreSQL 的 `Task` 和 `TaskAttempt`。

## 任务 Stream

```text
stream:task:llm
stream:task:image
stream:task:video
stream:task:audio
stream:task:render
stream:task:qc
```

## Consumer Group

默认 Consumer Group：

```text
workers:{capability}
```

Consumer 名称使用：`{hostname}:{process}:{instance}`。

## 事件 Stream

```text
event:project:{projectId}
event:episode:{episodeId}
event:task:{taskId}
```

所有消息必须包含 `taskId`（事件除外时使用 `eventId`）、`traceId`、`createdAt` 和 `schemaVersion`。
