/* global require */
/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Stable UUIDs make this fixture idempotent and easy to query or remove in a disposable database.
const ids = {
  project: '00000000-0000-0000-0000-000000000001',
  season: '00000000-0000-0000-0000-000000000002',
  episode: '00000000-0000-0000-0000-000000000003',
  sourceDocument: '00000000-0000-0000-0000-000000000004',
  sourceDocumentVersion: '00000000-0000-0000-0000-000000000005',
  sourceSegment: '00000000-0000-0000-0000-000000000006',
  script: '00000000-0000-0000-0000-000000000007',
  scriptVersion: '00000000-0000-0000-0000-000000000008',
  scene: '00000000-0000-0000-0000-000000000009',
  beat: '00000000-0000-0000-0000-000000000010',
  dialogue: '00000000-0000-0000-0000-000000000011',
  shot: '00000000-0000-0000-0000-000000000012',
  shotVersion: '00000000-0000-0000-0000-000000000013',
  asset: '00000000-0000-0000-0000-000000000014',
  assetVersion: '00000000-0000-0000-0000-000000000015',
  timeline: '00000000-0000-0000-0000-000000000016',
  timelineVersion: '00000000-0000-0000-0000-000000000017',
  track: '00000000-0000-0000-0000-000000000018',
  clip: '00000000-0000-0000-0000-000000000019',
  workflow: '00000000-0000-0000-0000-000000000020',
  workflowRun: '00000000-0000-0000-0000-000000000021',
  task: '00000000-0000-0000-0000-000000000022',
  taskAttempt: '00000000-0000-0000-0000-000000000023',
  generation: '00000000-0000-0000-0000-000000000024',
  providerJob: '00000000-0000-0000-0000-000000000025',
  generationCandidate: '00000000-0000-0000-0000-000000000026',
  review: '00000000-0000-0000-0000-000000000027',
  reviewComment: '00000000-0000-0000-0000-000000000028',
  approval: '00000000-0000-0000-0000-000000000029',
  exportPreset: '00000000-0000-0000-0000-000000000030',
  renderJob: '00000000-0000-0000-0000-000000000031',
  renderSegment: '00000000-0000-0000-0000-000000000032',
  usageRecord: '00000000-0000-0000-0000-000000000033',
  costRecord: '00000000-0000-0000-0000-000000000034',
  auditLog: '00000000-0000-0000-0000-000000000035',
  userOwner: '00000000-0000-0000-0000-000000000036',
  userEditor: '00000000-0000-0000-0000-000000000037',
  team: '00000000-0000-0000-0000-000000000038',
  teamMemberOwner: '00000000-0000-0000-0000-000000000039',
  teamMemberEditor: '00000000-0000-0000-0000-000000000040',
  projectTeam: '00000000-0000-0000-0000-000000000041',
  projectMemberEditor: '00000000-0000-0000-0000-000000000042',
};

async function seed() {
  await prisma.$transaction(async (tx) => {
    await tx.project.upsert({
      where: { id: ids.project },
      update: {},
      create: {
        id: ids.project,
        slug: 'seed-rainy-night-lamp',
        name: '种子项目：雨夜的灯',
        description: '用于本地开发、迁移和追溯关系验证的最小演示项目。',
        status: 'ACTIVE',
      },
    });

    await tx.user.upsert({
      where: { id: ids.userOwner },
      update: {},
      create: {
        id: ids.userOwner,
        email: 'seed.owner@comicdrama.local',
        displayName: 'Seed Owner',
        status: 'ACTIVE',
      },
    });

    await tx.user.upsert({
      where: { id: ids.userEditor },
      update: {},
      create: {
        id: ids.userEditor,
        email: 'seed.editor@comicdrama.local',
        displayName: 'Seed Editor',
        status: 'ACTIVE',
      },
    });

    await tx.team.upsert({
      where: { id: ids.team },
      update: {},
      create: {
        id: ids.team,
        slug: 'seed-production-team',
        name: 'Seed Production Team',
        description: '用于验证团队成员和项目团队授权关系的种子团队。',
        status: 'ACTIVE',
      },
    });

    await tx.teamMember.upsert({
      where: { id: ids.teamMemberOwner },
      update: {},
      create: {
        id: ids.teamMemberOwner,
        teamId: ids.team,
        userId: ids.userOwner,
        status: 'ACTIVE',
        isAdmin: true,
        acceptedAt: new Date('2026-09-22T00:00:00.000Z'),
      },
    });

    await tx.teamMember.upsert({
      where: { id: ids.teamMemberEditor },
      update: {},
      create: {
        id: ids.teamMemberEditor,
        teamId: ids.team,
        userId: ids.userEditor,
        status: 'ACTIVE',
        isAdmin: false,
        acceptedAt: new Date('2026-09-22T00:00:00.000Z'),
      },
    });

    await tx.projectTeam.upsert({
      where: { id: ids.projectTeam },
      update: {},
      create: {
        id: ids.projectTeam,
        projectId: ids.project,
        teamId: ids.team,
        status: 'ACTIVE',
        accessLevel: 'MANAGE',
      },
    });

    await tx.projectMember.upsert({
      where: { id: ids.projectMemberEditor },
      update: {},
      create: {
        id: ids.projectMemberEditor,
        projectId: ids.project,
        userId: ids.userEditor,
        status: 'ACTIVE',
        accessLevel: 'EDIT',
        acceptedAt: new Date('2026-09-22T00:00:00.000Z'),
      },
    });
    await tx.season.upsert({
      where: { id: ids.season },
      update: {},
      create: {
        id: ids.season,
        projectId: ids.project,
        number: 1,
        title: '第一季',
        status: 'ACTIVE',
      },
    });

    await tx.episode.upsert({
      where: { id: ids.episode },
      update: {},
      create: {
        id: ids.episode,
        seasonId: ids.season,
        projectId: ids.project,
        number: 1,
        title: '雨夜的灯',
        synopsis: '雨夜中，一盏灯引导主角作出新的选择。',
        status: 'IN_PROGRESS',
        durationSeconds: 8,
      },
    });

    await tx.sourceDocument.upsert({
      where: { id: ids.sourceDocument },
      update: {},
      create: {
        id: ids.sourceDocument,
        projectId: ids.project,
        name: '雨夜的灯（种子原文）',
        documentType: 'MARKDOWN',
        status: 'READY',
      },
    });

    await tx.sourceDocumentVersion.upsert({
      where: { id: ids.sourceDocumentVersion },
      update: {},
      create: {
        id: ids.sourceDocumentVersion,
        documentId: ids.sourceDocument,
        version: 1,
        fileName: 'V1测试样本_雨夜的灯.md',
        fileExtension: 'md',
        mimeType: 'text/markdown',
        byteSize: BigInt(256),
        sha256: 'a'.repeat(64),
        storageKey: 'seed/source/rainy-night-lamp/v1.md',
        textContent: '雨夜里，巷口的灯仍然亮着。',
        parserName: 'seed',
        parserVersion: '1',
        status: 'READY',
        parsedAt: new Date('2026-09-21T00:00:00.000Z'),
      },
    });

    await tx.sourceDocument.update({
      where: { id: ids.sourceDocument },
      data: { currentVersionId: ids.sourceDocumentVersion },
    });

    await tx.sourceSegment.upsert({
      where: { id: ids.sourceSegment },
      update: {},
      create: {
        id: ids.sourceSegment,
        versionId: ids.sourceDocumentVersion,
        type: 'CHAPTER',
        ordinal: 1,
        title: '巷口的灯',
        content: '雨夜里，巷口的灯仍然亮着。',
        startOffset: 0,
        endOffset: 14,
        startLine: 1,
        endLine: 1,
      },
    });

    await tx.script.upsert({
      where: { id: ids.script },
      update: {},
      create: {
        id: ids.script,
        projectId: ids.project,
        episodeId: ids.episode,
        title: '雨夜的灯',
        status: 'IN_PROGRESS',
      },
    });

    await tx.scriptVersion.upsert({
      where: { id: ids.scriptVersion },
      update: {},
      create: {
        id: ids.scriptVersion,
        scriptId: ids.script,
        version: 1,
        sourceVersionId: ids.sourceDocumentVersion,
        title: '雨夜的灯（剧本 v1）',
        synopsis: '主角在雨夜巷口看见一盏未熄的灯。',
        adaptationMode: 'STANDARD',
        status: 'DRAFT',
        changeSummary: '由种子原文生成的最小剧本版本。',
      },
    });

    await tx.script.update({
      where: { id: ids.script },
      data: { currentVersionId: ids.scriptVersion },
    });

    await tx.scene.upsert({
      where: { id: ids.scene },
      update: {},
      create: {
        id: ids.scene,
        scriptVersionId: ids.scriptVersion,
        sourceSegmentId: ids.sourceSegment,
        ordinal: 1,
        heading: '外景：巷口',
        interiorExterior: 'EXT',
        timeOfDay: '夜',
        location: '雨夜的旧巷',
        atmosphere: '潮湿、安静',
        summary: '主角停在巷口，看见亮着的灯。',
      },
    });

    await tx.beat.upsert({
      where: { id: ids.beat },
      update: {},
      create: {
        id: ids.beat,
        sceneId: ids.scene,
        sourceSegmentId: ids.sourceSegment,
        ordinal: 1,
        type: 'REVEAL',
        summary: '镜头从雨幕中显出巷口的一盏暖灯。',
        emotionalState: '迟疑转为安心',
        durationSeconds: 4,
      },
    });

    await tx.dialogue.upsert({
      where: { id: ids.dialogue },
      update: {},
      create: {
        id: ids.dialogue,
        sceneId: ids.scene,
        beatId: ids.beat,
        sourceSegmentId: ids.sourceSegment,
        ordinal: 1,
        type: 'VOICE_OVER',
        speaker: '旁白',
        text: '雨再大，灯也没有熄。',
      },
    });

    await tx.shot.upsert({
      where: { id: ids.shot },
      update: {},
      create: {
        id: ids.shot,
        projectId: ids.project,
        scriptVersionId: ids.scriptVersion,
        beatId: ids.beat,
        ordinal: 1,
        title: '雨幕中的巷口灯',
        status: 'IN_PROGRESS',
      },
    });

    await tx.shotVersion.upsert({
      where: { id: ids.shotVersion },
      update: {},
      create: {
        id: ids.shotVersion,
        shotId: ids.shot,
        scriptVersionId: ids.scriptVersion,
        sourceSegmentId: ids.sourceSegment,
        version: 1,
        durationFrames: 96,
        shotSize: '中远景',
        cameraAngle: '平视',
        cameraMovement: '缓慢推进',
        action: '雨幕中显出巷口的一盏暖灯。',
        generationStrategy: 'IMAGE_TO_VIDEO',
        status: 'DRAFT',
      },
    });

    await tx.shot.update({
      where: { id: ids.shot },
      data: { currentVersionId: ids.shotVersion },
    });

    await tx.asset.upsert({
      where: { id: ids.asset },
      update: {},
      create: {
        id: ids.asset,
        projectId: ids.project,
        name: '巷口暖灯参考图',
        slug: 'seed-alley-lamp-reference',
        type: 'IMAGE',
        status: 'ACTIVE',
      },
    });

    await tx.assetVersion.upsert({
      where: { id: ids.assetVersion },
      update: {},
      create: {
        id: ids.assetVersion,
        assetId: ids.asset,
        version: 1,
        status: 'APPROVED',
        fileName: 'seed-alley-lamp.png',
        mimeType: 'image/png',
        byteSize: BigInt(1024),
        sha256: 'b'.repeat(64),
        storageKey: 'seed/assets/alley-lamp/v1.png',
        width: 1280,
        height: 720,
        prompt: '雨夜旧巷，暖黄色灯光，电影感。',
      },
    });

    await tx.asset.update({
      where: { id: ids.asset },
      data: { currentVersionId: ids.assetVersion },
    });

    await tx.timeline.upsert({
      where: { id: ids.timeline },
      update: {},
      create: {
        id: ids.timeline,
        projectId: ids.project,
        episodeId: ids.episode,
        name: '雨夜的灯（粗剪）',
        status: 'IN_PROGRESS',
      },
    });

    await tx.timelineVersion.upsert({
      where: { id: ids.timelineVersion },
      update: {},
      create: {
        id: ids.timelineVersion,
        timelineId: ids.timeline,
        version: 1,
        status: 'DRAFT',
        timebase: 24,
        durationFrames: 96,
        metadata: { fixture: true },
      },
    });

    await tx.timeline.update({
      where: { id: ids.timeline },
      data: { currentVersionId: ids.timelineVersion },
    });

    await tx.track.upsert({
      where: { id: ids.track },
      update: {},
      create: {
        id: ids.track,
        timelineVersionId: ids.timelineVersion,
        name: '主视频',
        type: 'VIDEO',
        sortOrder: 0,
      },
    });

    await tx.clip.upsert({
      where: { id: ids.clip },
      update: {},
      create: {
        id: ids.clip,
        trackId: ids.track,
        sourceType: 'ASSET_VERSION',
        assetVersionId: ids.assetVersion,
        timelineStartFrame: 0,
        durationFrames: 96,
        sourceInFrame: 0,
        sourceOutFrame: 96,
      },
    });

    await tx.workflow.upsert({
      where: { id: ids.workflow },
      update: {},
      create: {
        id: ids.workflow,
        projectId: ids.project,
        name: '种子镜头生成工作流',
        slug: 'seed-shot-generation',
        status: 'ACTIVE',
        definition: { version: 1, nodes: [{ id: 'generate-shot', type: 'generation' }] },
      },
    });

    await tx.workflowRun.upsert({
      where: { id: ids.workflowRun },
      update: {},
      create: {
        id: ids.workflowRun,
        workflowId: ids.workflow,
        projectId: ids.project,
        workflowVersion: 1,
        status: 'SUCCEEDED',
        traceId: 'seed-trace-rainy-night-lamp',
      },
    });

    await tx.task.upsert({
      where: { id: ids.task },
      update: {},
      create: {
        id: ids.task,
        projectId: ids.project,
        workflowRunId: ids.workflowRun,
        type: 'GENERATE_SHOT',
        resourceType: 'ShotVersion',
        resourceId: ids.shotVersion,
        idempotencyKey: 'seed:generate-shot:rainy-night-lamp:v1',
        status: 'SUCCEEDED',
        traceId: 'seed-trace-rainy-night-lamp',
      },
    });

    await tx.taskAttempt.upsert({
      where: { id: ids.taskAttempt },
      update: {},
      create: {
        id: ids.taskAttempt,
        taskId: ids.task,
        attempt: 1,
        status: 'SUCCEEDED',
        workerId: 'seed-worker',
        traceId: 'seed-trace-rainy-night-lamp',
        retryable: false,
      },
    });

    await tx.generation.upsert({
      where: { id: ids.generation },
      update: {},
      create: {
        id: ids.generation,
        projectId: ids.project,
        targetType: 'ShotVersion',
        targetId: ids.shotVersion,
        type: 'VIDEO',
        status: 'SUCCEEDED',
        provider: 'seed-provider',
        model: 'seed-video-v1',
        requestedCount: 1,
        currency: 'USD',
        inputSnapshot: { shotVersionId: ids.shotVersion },
      },
    });

    await tx.providerJob.upsert({
      where: { id: ids.providerJob },
      update: {},
      create: {
        id: ids.providerJob,
        generationId: ids.generation,
        provider: 'seed-provider',
        model: 'seed-video-v1',
        externalJobId: 'seed-provider-job-rainy-night-lamp',
        idempotencyKey: 'seed:provider-job:rainy-night-lamp:v1',
        status: 'SUCCEEDED',
        attempt: 1,
      },
    });

    await tx.generationCandidate.upsert({
      where: { id: ids.generationCandidate },
      update: {},
      create: {
        id: ids.generationCandidate,
        generationId: ids.generation,
        providerJobId: ids.providerJob,
        ordinal: 1,
        status: 'READY',
        providerOutputId: 'seed-candidate-rainy-night-lamp',
        fileName: 'seed-rainy-night-lamp.mp4',
        mimeType: 'video/mp4',
        storageKey: 'seed/generations/rainy-night-lamp/v1.mp4',
        durationMs: 4000,
      },
    });

    await tx.exportPreset.upsert({
      where: { id: ids.exportPreset },
      update: {},
      create: {
        id: ids.exportPreset,
        projectId: ids.project,
        name: '种子 720p MP4',
        slug: 'seed-720p-mp4',
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        width: 1280,
        height: 720,
        fps: 24,
        bitrate: 3000,
        audioSampleRate: 48000,
        aspectRatio: '16:9',
        isDefault: true,
      },
    });

    await tx.renderJob.upsert({
      where: { id: ids.renderJob },
      update: {},
      create: {
        id: ids.renderJob,
        projectId: ids.project,
        timelineVersionId: ids.timelineVersion,
        exportPresetId: ids.exportPreset,
        idempotencyKey: 'seed:render:rainy-night-lamp:v1',
        status: 'SUCCEEDED',
        outputStorageKey: 'seed/renders/rainy-night-lamp/v1.mp4',
        outputFileName: 'seed-rainy-night-lamp.mp4',
        mimeType: 'video/mp4',
        width: 1280,
        height: 720,
        durationMs: 4000,
      },
    });

    await tx.renderSegment.upsert({
      where: { id: ids.renderSegment },
      update: {},
      create: {
        id: ids.renderSegment,
        renderJobId: ids.renderJob,
        segmentIndex: 0,
        startFrame: 0,
        endFrame: 96,
        status: 'SUCCEEDED',
        storageKey: 'seed/renders/rainy-night-lamp/segments/0.mp4',
        durationMs: 4000,
      },
    });

    await tx.review.upsert({
      where: { id: ids.review },
      update: {},
      create: {
        id: ids.review,
        projectId: ids.project,
        targetType: 'TIMELINE_VERSION',
        targetId: ids.timelineVersion,
        status: 'APPROVED',
        revision: 1,
        title: '种子时间线审核',
        summary: '用于验证审核、评论和审批记录的追溯关系。',
      },
    });

    await tx.reviewComment.upsert({
      where: { id: ids.reviewComment },
      update: {},
      create: {
        id: ids.reviewComment,
        reviewId: ids.review,
        authorId: 'seed-reviewer',
        body: '暖灯出现的节奏符合预期。',
        timecodeFrame: 24,
        targetPath: 'tracks[0].clips[0]',
        status: 'RESOLVED',
        resolvedById: 'seed-reviewer',
        resolvedAt: new Date('2026-09-21T00:00:00.000Z'),
      },
    });

    await tx.approval.upsert({
      where: { id: ids.approval },
      update: {},
      create: {
        id: ids.approval,
        reviewId: ids.review,
        reviewerId: 'seed-director',
        role: 'DIRECTOR',
        decision: 'APPROVED',
        comment: '种子数据审核通过。',
        decidedAt: new Date('2026-09-21T00:00:00.000Z'),
      },
    });

    await tx.usageRecord.upsert({
      where: { id: ids.usageRecord },
      update: {},
      create: {
        id: ids.usageRecord,
        projectId: ids.project,
        generationId: ids.generation,
        providerJobId: ids.providerJob,
        sourceType: 'GENERATION',
        metric: 'VIDEO_SECONDS',
        resourceType: 'Generation',
        resourceId: ids.generation,
        provider: 'seed-provider',
        model: 'seed-video-v1',
        quantity: '4',
        unit: 'seconds',
      },
    });

    await tx.costRecord.upsert({
      where: { id: ids.costRecord },
      update: {},
      create: {
        id: ids.costRecord,
        projectId: ids.project,
        usageRecordId: ids.usageRecord,
        generationId: ids.generation,
        category: 'AI_GENERATION',
        status: 'ACCRUED',
        provider: 'seed-provider',
        model: 'seed-video-v1',
        description: '种子生成成本记录。',
        quantity: '4',
        unit: 'seconds',
        unitPrice: '0.01',
        amount: '0.04',
        currency: 'USD',
      },
    });

    await tx.auditLog.upsert({
      where: { id: ids.auditLog },
      update: {},
      create: {
        id: ids.auditLog,
        projectId: ids.project,
        actorId: 'seed-system',
        actorType: 'SYSTEM',
        action: 'SEED_CREATED',
        entityType: 'Project',
        entityId: ids.project,
        requestId: 'seed-request-rainy-night-lamp',
        traceId: 'seed-trace-rainy-night-lamp',
        after: { fixture: 'rainy-night-lamp', version: 1 },
      },
    });
  });

  const project = await prisma.project.findUnique({
    where: { id: ids.project },
    include: {
      _count: {
        select: {
          episodes: true,
          sourceDocuments: true,
          scripts: true,
          shots: true,
          timelines: true,
          assets: true,
          workflows: true,
          reviews: true,
          renderJobs: true,
          usageRecords: true,
          costRecords: true,
          auditLogs: true,
          members: true,
          teamGrants: true,
        },
      },
    },
  });

  console.log('已写入或确认种子数据：', project?.slug, project?._count);
}

seed()
  .catch((error) => {
    console.error('种子数据写入失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
