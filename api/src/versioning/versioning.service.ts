import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export type VersionEntityType =
  | 'SourceDocumentVersion'
  | 'ScriptVersion'
  | 'ShotVersion'
  | 'AssetVersion'
  | 'LocationVersion'
  | 'TimelineVersion';

export interface CreateSourceDocumentVersionInput {
  documentId: string;
  data: Omit<Prisma.SourceDocumentVersionUncheckedCreateInput, 'id' | 'documentId' | 'version'>;
}

export interface CreateSourceDocumentWithVersionInput {
  projectId: string;
  document: Omit<
    Prisma.SourceDocumentUncheckedCreateInput,
    'id' | 'projectId' | 'version' | 'currentVersionId'
  >;
  version: Omit<Prisma.SourceDocumentVersionUncheckedCreateInput, 'id' | 'documentId' | 'version'>;
}

export interface CreateScriptVersionInput {
  scriptId: string;
  data: Omit<
    Prisma.ScriptVersionUncheckedCreateInput,
    'id' | 'scriptId' | 'version' | 'parentVersionId'
  >;
  parentVersionId?: string;
}

export interface CreateShotVersionInput {
  shotId: string;
  scriptVersionId: string;
  data: Omit<
    Prisma.ShotVersionUncheckedCreateInput,
    'id' | 'shotId' | 'scriptVersionId' | 'version' | 'parentVersionId'
  >;
  parentVersionId?: string;
}

export interface CreateAssetVersionInput {
  assetId: string;
  data: Omit<
    Prisma.AssetVersionUncheckedCreateInput,
    'id' | 'assetId' | 'version' | 'parentVersionId'
  >;
  parentVersionId?: string;
}

export interface CreateLocationVersionInput {
  locationId: string;
  data: Omit<
    Prisma.LocationVersionUncheckedCreateInput,
    'id' | 'locationId' | 'version' | 'parentVersionId'
  >;
  parentVersionId?: string;
}

export interface CreateTimelineVersionInput {
  timelineId: string;
  data: Omit<
    Prisma.TimelineVersionUncheckedCreateInput,
    'id' | 'timelineId' | 'version' | 'parentVersionId'
  >;
  parentVersionId?: string;
}

@Injectable()
export class VersioningService {
  constructor(private readonly prisma: PrismaService) {}

  async createSourceDocumentVersion(input: CreateSourceDocumentVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.sourceDocument.findUnique({ where: { id: input.documentId } });
      if (!aggregate) {
        throw new NotFoundException('原文不存在');
      }
      const latest = await tx.sourceDocumentVersion.findFirst({
        where: { documentId: input.documentId },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      const created = await tx.sourceDocumentVersion.create({
        data: { ...input.data, documentId: input.documentId, version },
      });
      await tx.sourceDocument.update({
        where: { id: input.documentId },
        data: { version, currentVersionId: created.id },
      });
      return created;
    });
  }

  async createSourceDocumentWithVersion(input: CreateSourceDocumentWithVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: input.projectId } });
      if (!project) {
        throw new NotFoundException('项目不存在');
      }

      const document = await tx.sourceDocument.create({
        data: { ...input.document, projectId: input.projectId },
      });
      const version = await tx.sourceDocumentVersion.create({
        data: { ...input.version, documentId: document.id, version: 1 },
      });
      const updatedDocument = await tx.sourceDocument.update({
        where: { id: document.id },
        data: { version: 1, currentVersionId: version.id },
      });

      return { document: updatedDocument, version };
    });
  }

  async createScriptVersion(input: CreateScriptVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.script.findUnique({ where: { id: input.scriptId } });
      if (!aggregate) {
        throw new NotFoundException('剧本不存在');
      }
      const latest = await tx.scriptVersion.findFirst({
        where: { scriptId: input.scriptId },
        orderBy: { version: 'desc' },
      });
      const parentVersionId = await this.resolveParentVersionId(
        input.parentVersionId,
        latest?.id,
        async (id) => tx.scriptVersion.findFirst({ where: { id, scriptId: input.scriptId } }),
      );
      const version = (latest?.version ?? 0) + 1;
      const created = await tx.scriptVersion.create({
        data: { ...input.data, scriptId: input.scriptId, version, parentVersionId },
      });
      await tx.script.update({
        where: { id: input.scriptId },
        data: { version, currentVersionId: created.id },
      });
      return created;
    });
  }

  async createShotVersion(input: CreateShotVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.shot.findUnique({ where: { id: input.shotId } });
      if (!aggregate) {
        throw new NotFoundException('镜头不存在');
      }
      const latest = await tx.shotVersion.findFirst({
        where: { shotId: input.shotId },
        orderBy: { version: 'desc' },
      });
      const parentVersionId = await this.resolveParentVersionId(
        input.parentVersionId,
        latest?.id,
        async (id) => tx.shotVersion.findFirst({ where: { id, shotId: input.shotId } }),
      );
      const version = (latest?.version ?? 0) + 1;
      const created = await tx.shotVersion.create({
        data: {
          ...input.data,
          shotId: input.shotId,
          scriptVersionId: input.scriptVersionId,
          version,
          parentVersionId,
        },
      });
      await tx.shot.update({
        where: { id: input.shotId },
        data: { version, currentVersionId: created.id },
      });
      return created;
    });
  }

  async createAssetVersion(input: CreateAssetVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.asset.findUnique({ where: { id: input.assetId } });
      if (!aggregate) {
        throw new NotFoundException('资产不存在');
      }
      const latest = await tx.assetVersion.findFirst({
        where: { assetId: input.assetId },
        orderBy: { version: 'desc' },
      });
      const parentVersionId = await this.resolveParentVersionId(
        input.parentVersionId,
        latest?.id,
        async (id) => tx.assetVersion.findFirst({ where: { id, assetId: input.assetId } }),
      );
      const version = (latest?.version ?? 0) + 1;
      const created = await tx.assetVersion.create({
        data: { ...input.data, assetId: input.assetId, version, parentVersionId },
      });
      await tx.asset.update({
        where: { id: input.assetId },
        data: { version, currentVersionId: created.id },
      });
      return created;
    });
  }

  async createLocationVersion(input: CreateLocationVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.location.findUnique({ where: { id: input.locationId } });
      if (!aggregate) {
        throw new NotFoundException('场景不存在');
      }
      const latest = await tx.locationVersion.findFirst({
        where: { locationId: input.locationId },
        orderBy: { version: 'desc' },
      });
      const parentVersionId = await this.resolveParentVersionId(
        input.parentVersionId,
        latest?.id,
        async (id) => tx.locationVersion.findFirst({ where: { id, locationId: input.locationId } }),
      );
      const version = (latest?.version ?? 0) + 1;
      const created = await tx.locationVersion.create({
        data: { ...input.data, locationId: input.locationId, version, parentVersionId },
      });
      await tx.location.update({
        where: { id: input.locationId },
        data: { version, currentVersionId: created.id },
      });
      return created;
    });
  }

  async createTimelineVersion(input: CreateTimelineVersionInput) {
    return this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.timeline.findUnique({ where: { id: input.timelineId } });
      if (!aggregate) {
        throw new NotFoundException('时间线不存在');
      }
      const latest = await tx.timelineVersion.findFirst({
        where: { timelineId: input.timelineId },
        orderBy: { version: 'desc' },
      });
      const parentVersionId = await this.resolveParentVersionId(
        input.parentVersionId,
        latest?.id,
        async (id) => tx.timelineVersion.findFirst({ where: { id, timelineId: input.timelineId } }),
      );
      const version = (latest?.version ?? 0) + 1;
      const created = await tx.timelineVersion.create({
        data: { ...input.data, timelineId: input.timelineId, version, parentVersionId },
      });
      await tx.timeline.update({
        where: { id: input.timelineId },
        data: { version, currentVersionId: created.id },
      });
      return created;
    });
  }

  async assertVersionUpdateAllowed(
    entityType: VersionEntityType,
    versionId: string,
  ): Promise<void> {
    const downstreamCount = await this.countDownstreamReferences(entityType, versionId);
    if (downstreamCount > 0) {
      throw new ConflictException('该版本已进入下游，禁止原地修改，请创建新版本');
    }
  }

  async assertVersionDeletionAllowed(): Promise<never> {
    throw new ConflictException('版本快照为追加式事实，禁止删除，请创建新版本或归档所属聚合根');
  }

  private async resolveParentVersionId<T>(
    requestedParentId: string | undefined,
    defaultParentId: string | undefined,
    findParent: (id: string) => Promise<T | null>,
  ): Promise<string | undefined> {
    const parentVersionId = requestedParentId ?? defaultParentId;
    if (!parentVersionId) {
      return undefined;
    }
    const parent = await findParent(parentVersionId);
    if (!parent) {
      throw new ConflictException('父版本不存在或不属于当前聚合根');
    }
    return parentVersionId;
  }

  private async countDownstreamReferences(
    entityType: VersionEntityType,
    versionId: string,
  ): Promise<number> {
    switch (entityType) {
      case 'SourceDocumentVersion': {
        const version = await this.prisma.sourceDocumentVersion.findUnique({
          where: { id: versionId },
          select: { _count: { select: { segments: true, scriptVersions: true } } },
        });
        return (version?._count.segments ?? 0) + (version?._count.scriptVersions ?? 0);
      }
      case 'ScriptVersion': {
        const version = await this.prisma.scriptVersion.findUnique({
          where: { id: versionId },
          select: { _count: { select: { scenes: true, shots: true, shotVersions: true } } },
        });
        return (
          (version?._count.scenes ?? 0) +
          (version?._count.shots ?? 0) +
          (version?._count.shotVersions ?? 0)
        );
      }
      case 'ShotVersion': {
        const version = await this.prisma.shotVersion.findUnique({
          where: { id: versionId },
          select: { _count: { select: { panels: true, assetReferences: true } } },
        });
        return (version?._count.panels ?? 0) + (version?._count.assetReferences ?? 0);
      }
      case 'AssetVersion': {
        const version = await this.prisma.assetVersion.findUnique({
          where: { id: versionId },
          select: {
            _count: {
              select: {
                references: true,
                collectionPins: true,
                characterAppearances: true,
                locationVersions: true,
                propCurrents: true,
                voiceSamples: true,
                timelineClips: true,
              },
            },
          },
        });
        return version ? Object.values(version._count).reduce((sum, count) => sum + count, 0) : 0;
      }
      case 'LocationVersion': {
        return 0;
      }
      case 'TimelineVersion': {
        const version = await this.prisma.timelineVersion.findUnique({
          where: { id: versionId },
          select: { _count: { select: { tracks: true, transitions: true, renderJobs: true } } },
        });
        return (
          (version?._count.tracks ?? 0) +
          (version?._count.transitions ?? 0) +
          (version?._count.renderJobs ?? 0)
        );
      }
    }
  }
}
