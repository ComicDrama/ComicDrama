export interface ApiMeta {
  traceId: string;
  page?: { page: number; pageSize: number; total?: number };
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  traceId: string;
  details?: Record<string, unknown>;
}