import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SourceDraftKind,
  SourceDraftGenerationStatus,
  SourceVersionEntityResolutionStatus,
  SourceVersionStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export const SOURCE_DRAFT_GENERATOR_NAME = 'builtin-cited-source-draft-generator';
export const SOURCE_DRAFT_GENERATOR_VERSION = '1.0.0';

@Injectable()
export class SourceDraftGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(projectId: string, documentId: string, versionId: string) {
    const version = await this.prisma.sourceDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { projectId } },
      include: { document: true },
    });
    if (!version) throw new NotFoundException('原文版本不存在或不属于当前项目');
    if (version.status !== SourceVersionStatus.READY)
      throw new BadRequestException('仅 READY 原文版本可生成初稿');
    const resolution = await this.prisma.sourceVersionEntityResolution.findUnique({
      where: {
        sourceVersionId_normalizerName_normalizerVersion: {
          sourceVersionId: versionId,
          normalizerName: 'builtin-surface-entity-normalizer',
          normalizerVersion: '1.0.0',
        },
      },
      include: {
        canonicalEntities: {
          orderBy: { ordinal: 'asc' },
          include: {
            aliases: { orderBy: { name: 'asc' } },
            members: {
              orderBy: { createdAt: 'asc' },
              include: {
                extractedEntity: {
                  include: {
                    mentions: { orderBy: { ordinal: 'asc' }, include: { sourceSegment: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!resolution || resolution.status !== SourceVersionEntityResolutionStatus.SUCCEEDED)
      throw new BadRequestException('请先成功完成 P3-09 跨章节实体归并');

    const drafts = buildDrafts(resolution.canonicalEntities);
    const generation = await this.prisma.$transaction(async (tx) => {
      const record = await tx.sourceDraftGeneration.upsert({
        where: {
          sourceVersionId_generatorName_generatorVersion: {
            sourceVersionId: versionId,
            generatorName: SOURCE_DRAFT_GENERATOR_NAME,
            generatorVersion: SOURCE_DRAFT_GENERATOR_VERSION,
          },
        },
        create: {
          projectId,
          sourceDocumentId: documentId,
          sourceVersionId: versionId,
          entityResolutionId: resolution.id,
          generatorName: SOURCE_DRAFT_GENERATOR_NAME,
          generatorVersion: SOURCE_DRAFT_GENERATOR_VERSION,
          status: SourceDraftGenerationStatus.RUNNING,
        },
        update: {
          entityResolutionId: resolution.id,
          status: SourceDraftGenerationStatus.RUNNING,
          errorMessage: null,
        },
      });
      await tx.sourceDraftEntity.deleteMany({ where: { generationId: record.id } });
      for (const [index, draft] of drafts.entries()) {
        await tx.sourceDraftEntity.create({
          data: {
            generationId: record.id,
            canonicalEntityId: draft.canonicalEntityId,
            kind: draft.kind,
            name: draft.name,
            ordinal: index,
            confidence: draft.confidence,
            content: draft.content as Prisma.InputJsonValue,
            citations: {
              create: draft.citations.map((citation) => ({
                sourceSegmentId: citation.sourceSegmentId,
                canonicalMemberId: citation.canonicalMemberId,
                quote: citation.quote,
                startOffset: citation.startOffset,
                endOffset: citation.endOffset,
                startLine: citation.startLine,
                endLine: citation.endLine,
                confidence: citation.confidence,
              })),
            },
          },
        });
      }
      return tx.sourceDraftGeneration.update({
        where: { id: record.id },
        data: { status: SourceDraftGenerationStatus.SUCCEEDED, generatedAt: new Date() },
      });
    });
    return this.get(projectId, documentId, versionId, generation.id);
  }

  async get(projectId: string, documentId: string, versionId: string, generationId?: string) {
    const include = {
      items: {
        orderBy: [{ kind: 'asc' as const }, { ordinal: 'asc' as const }],
        include: {
          citations: {
            orderBy: [{ sourceSegmentId: 'asc' as const }, { startOffset: 'asc' as const }],
            include: {
              sourceSegment: { select: { id: true, title: true, type: true, ordinal: true } },
            },
          },
        },
      },
    };
    const generation = await this.prisma.sourceDraftGeneration.findFirst({
      where: {
        projectId,
        sourceDocumentId: documentId,
        sourceVersionId: versionId,
        generatorName: SOURCE_DRAFT_GENERATOR_NAME,
        generatorVersion: SOURCE_DRAFT_GENERATOR_VERSION,
        ...(generationId ? { id: generationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include,
    });
    if (!generation) throw new NotFoundException('该版本尚无初稿生成结果');
    return {
      id: generation.id,
      generator: {
        name: generation.generatorName,
        version: generation.generatorVersion,
        method: 'deterministic-candidate',
      },
      status: generation.status,
      generatedAt: generation.generatedAt,
      summary: Object.fromEntries(
        Object.values(SourceDraftKind).map((kind) => [
          kind.toLowerCase() + 'Count',
          generation.items.filter((item) => item.kind === kind).length,
        ]),
      ),
      items: generation.items,
    };
  }
}

type Citation = {
  sourceSegmentId: string;
  canonicalMemberId: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  startLine: number | null;
  endLine: number | null;
  confidence: number | null;
};
type Draft = {
  kind: SourceDraftKind;
  name: string;
  canonicalEntityId: string | null;
  confidence: number | null;
  content: Record<string, unknown>;
  citations: Citation[];
};
type Canonical = Prisma.CanonicalEntityGetPayload<Prisma.CanonicalEntityDefaultArgs> & {
  aliases: Array<{ name: string }>;
  members: Array<{
    id: string;
    extractedEntity: {
      mentions: Array<{
        sourceSegmentId: string;
        evidence: string | null;
        text: string;
        startOffset: number;
        endOffset: number;
        startLine: number | null;
        endLine: number | null;
        confidence: number | null;
      }>;
    };
  }>;
};

export function buildDrafts(entities: Canonical[]): Draft[] {
  const supported = entities.filter((entity) =>
    ['CHARACTER', 'LOCATION', 'PROP', 'ORGANIZATION', 'TIME', 'EVENT'].includes(entity.type),
  );
  const drafts: Draft[] = supported
    .filter((entity) => ['CHARACTER', 'LOCATION', 'PROP'].includes(entity.type))
    .map((entity) => {
      const citations = entity.members.flatMap((member) =>
        member.extractedEntity.mentions.map((mention) => ({
          sourceSegmentId: mention.sourceSegmentId,
          canonicalMemberId: member.id,
          quote: mention.text,
          startOffset: mention.startOffset,
          endOffset: mention.endOffset,
          startLine: mention.startLine,
          endLine: mention.endLine,
          confidence: mention.confidence,
        })),
      );
      const base = {
        canonicalEntityId: entity.id,
        kind: entity.type as SourceDraftKind,
        name: entity.canonicalName,
        confidence: entity.confidence,
        citations,
      };
      const openQuestions =
        entity.type === 'CHARACTER'
          ? ['角色定位、性格、背景、外貌及服装待人工确认']
          : entity.type === 'LOCATION'
            ? ['空间布局、氛围、时代及地理信息待人工确认']
            : ['类别、材质、尺寸、归属及状态待人工确认'];
      const content =
        entity.type === 'CHARACTER'
          ? {
              aliases: entity.aliases
                .filter((alias) => alias.name !== entity.canonicalName)
                .map((alias) => alias.name),
              role: null,
              personality: null,
              background: null,
              appearance: null,
              costume: null,
              openQuestions,
            }
          : entity.type === 'LOCATION'
            ? { description: null, atmosphere: null, timeContext: null, openQuestions }
            : {
                category: null,
                description: null,
                material: null,
                dimensions: null,
                defaultState: null,
                openQuestions,
              };
      return { ...base, content };
    });
  const worldCitations = supported.flatMap((entity) =>
    entity.members.flatMap((member) =>
      member.extractedEntity.mentions.map((mention) => ({
        sourceSegmentId: mention.sourceSegmentId,
        canonicalMemberId: member.id,
        quote: mention.evidence || mention.text,
        startOffset: mention.startOffset,
        endOffset: mention.endOffset,
        startLine: mention.startLine,
        endLine: mention.endLine,
        confidence: mention.confidence,
      })),
    ),
  );
  drafts.unshift({
    kind: SourceDraftKind.WORLD,
    name: '待确认世界观',
    canonicalEntityId: null,
    confidence: null,
    citations: worldCitations,
    content: {
      setting: null,
      organizations: supported
        .filter((entity) => entity.type === 'ORGANIZATION')
        .map((entity) => entity.canonicalName),
      terminology: [],
      timeCandidates: supported
        .filter((entity) => entity.type === 'TIME')
        .map((entity) => entity.canonicalName),
      eventCandidates: supported
        .filter((entity) => entity.type === 'EVENT')
        .map((entity) => entity.canonicalName),
      openQuestions: ['故事时代、地理范围、社会规则及势力关系待人工确认'],
    },
  });
  return drafts.sort((a, b) =>
    a.kind === SourceDraftKind.WORLD
      ? -1
      : b.kind === SourceDraftKind.WORLD
        ? 1
        : a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, 'zh-CN'),
  );
}
