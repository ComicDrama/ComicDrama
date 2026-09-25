import { ExtractedEntityType } from '@prisma/client';

export const CHAPTER_ENTITY_EXTRACTOR_NAME = 'builtin-rule-chapter-entity-extractor';
export const CHAPTER_ENTITY_EXTRACTOR_VERSION = '1.0.0';

export interface ChapterEntitySourceSegment {
  id: string;
  content: string;
  startOffset: number;
  startLine: number | null;
}

export interface ExtractedEntityMentionCandidate {
  sourceSegmentId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  startLine: number | null;
  endLine: number | null;
  evidence: string;
  confidence: number;
}

export interface ExtractedEntityCandidate {
  type: ExtractedEntityType;
  name: string;
  normalizedName: string;
  confidence: number;
  attributes: Record<string, string | number>;
  mentions: ExtractedEntityMentionCandidate[];
}

export interface ChapterEntityExtractor {
  readonly name: string;
  readonly version: string;
  extract(segments: ChapterEntitySourceSegment[]): ExtractedEntityCandidate[];
}
