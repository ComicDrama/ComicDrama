# MinIO Bucket 约定

默认 Bucket：`comicdrama`。

对象路径统一遵循架构说明书：

```text
projects/{projectId}/source/{sourceDocumentId}/{sourceVersionId}/original.ext
projects/{projectId}/assets/{assetId}/{assetVersionId}/reference-{index}.png
projects/{projectId}/generations/{generationId}/{candidateId}/output.ext
projects/{projectId}/episodes/{episodeId}/timeline/{timelineVersionId}/timeline.json
projects/{projectId}/episodes/{episodeId}/render/{renderJobId}/segment-{index}.mp4
projects/{projectId}/episodes/{episodeId}/export/{renderJobId}/final.mp4
```

数据库保存对象路径、哈希、MIME、尺寸、时长和版本信息，不把媒体二进制写入 PostgreSQL。
