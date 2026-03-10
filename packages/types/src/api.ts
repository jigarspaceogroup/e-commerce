export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  cursor?: string;
  limit: number;
  hasMore: boolean;
  total?: number;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { pagination: PaginationMeta };
}
