export type SourceDraftKind = 'WORLD' | 'CHARACTER' | 'LOCATION' | 'PROP';

export interface SourceDraftCitation {
  id: string;
  sourceSegmentId: string;
  canonicalMemberId: string | null;
  quote: string;
  startOffset: number;
  endOffset: number;
  startLine: number | null;
  endLine: number | null;
  confidence: number | null;
}

export interface SourceDraftEntity {
  id: string;
  kind: SourceDraftKind;
  name: string;
  canonicalEntityId: string | null;
  confidence: number | null;
  content: Record<string, unknown>;
  citations: SourceDraftCitation[];
}

export interface SourceDraftGeneration {
  id: string;
  generator: { name: string; version: string; method: 'deterministic-candidate' };
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  generatedAt: string | null;
  summary: Record<string, number>;
  items: SourceDraftEntity[];
}
