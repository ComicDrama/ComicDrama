import { SourceDocumentType, SourceSegmentType } from '@prisma/client';

export interface ParsedSourceSegment {
  type: SourceSegmentType;
  title?: string;
  content: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  parentIndex?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ParsedSourceText {
  textContent: string;
  segments: ParsedSourceSegment[];
}

export type SourceParserImplementationStatus = 'IMPLEMENTED' | 'PLANNED';

export interface SourceDocumentParser {
  readonly name: string;
  readonly version: string;
  readonly supportedDocumentTypes: readonly SourceDocumentType[];
  parse(text: string): ParsedSourceText;
}

export interface SourceDocumentParserRegistration {
  readonly name: string;
  readonly version: string;
  readonly documentTypes: readonly SourceDocumentType[];
  readonly status: SourceParserImplementationStatus;
  readonly task: string;
  readonly parser?: SourceDocumentParser;
}
