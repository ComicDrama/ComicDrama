# MinIO Bucket 约定

默认 Bucket：`comicdrama`。

对象路径统一遵循架构说明书。原文上传在创建数据库事实源之前先写入暂存路径，P3-03 创建 `SourceDocument` / `SourceDocumentVersion` 后可复用该对象路径，或按实现需要复制到正式版本路径：

```text
projects/{projectId}/source/uploads/{uploadId}/original.ext
projects/{projectId}/source/{sourceDocumentId}/{sourceVersionId}/original.ext
projects/{projectId}/assets/{assetId}/{assetVersionId}/reference-{index}.png
projects/{projectId}/generations/{generationId}/{candidateId}/output.ext
projects/{projectId}/episodes/{episodeId}/timeline/{timelineVersionId}/timeline.json
projects/{projectId}/episodes/{episodeId}/render/{renderJobId}/segment-{index}.mp4
projects/{projectId}/episodes/{episodeId}/export/{renderJobId}/final.mp4
```

数据库保存对象路径、哈希、MIME、尺寸、时长和版本信息，不把媒体二进制写入 PostgreSQL。
