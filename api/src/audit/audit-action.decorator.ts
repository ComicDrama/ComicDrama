import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_METADATA = 'audit_action';

export type AuditAction =
  'IMPORT' | 'GENERATE' | 'UPDATE' | 'REVIEW' | 'LOCK' | 'EXPORT' | 'DELETE' | 'ARCHIVE';

export interface AuditActionOptions {
  action: AuditAction;
  entityType: string;
  entityIdParam?: string;
  projectIdParam?: string;
  captureResponseSnapshot?: boolean;
}

export const AuditAction = (options: AuditActionOptions) =>
  SetMetadata(AUDIT_ACTION_METADATA, options);
