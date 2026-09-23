export const TASK_STATUSES = [
  'PENDING',
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'RETRYING',
  'FAILED',
  'CANCELLED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskType =
  | 'SOURCE_DOCUMENT_SEGMENTATION'
  | 'LLM_EXTRACT'
  | 'SCRIPT_GENERATE'
  | 'STORYBOARD_GENERATE'
  | 'IMAGE_GENERATE'
  | 'VIDEO_GENERATE'
  | 'AUDIO_GENERATE'
  | 'RENDER'
  | 'QC';

export interface TaskPayload {
  taskId: string;
  type: TaskType;
  projectId: string;
  resourceType: string;
  resourceId: string;
  inputVersion: number;
  idempotencyKey: string;
  priority: number;
  attempt: number;
  maxAttempts: number;
  traceId: string;
}
