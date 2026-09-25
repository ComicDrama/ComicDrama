export type SourceDraftKind = 'WORLD' | 'CHARACTER' | 'LOCATION' | 'PROP';
export type SourceDraftReviewStatus = 'PENDING' | 'NEEDS_REVIEW' | 'VALIDATED' | 'CORRECTED';

export interface SourceDraftValidationIssue {
  path: string;
  keyword: 'required' | 'type' | 'additionalProperties' | 'minLength';
  message: string;
  expected?: string;
  actual?: string;
}

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
  validationStatus: SourceDraftReviewStatus;
  validationErrors: SourceDraftValidationIssue[] | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  content: Record<string, unknown>;
  citations: SourceDraftCitation[];
}

export interface SourceDraftGeneration {
  id: string;
  generator: { name: string; version: string; method: 'deterministic-candidate' };
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  generatedAt: string | null;
  schema: { version: string };
  summary: Record<string, number>;
  items: SourceDraftEntity[];
}
