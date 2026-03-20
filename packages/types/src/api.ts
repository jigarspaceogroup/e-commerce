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

export interface SearchFacets {
  brands: Array<{ value: string; count: number }>;
  categories: Array<{ id: string; nameEn: string; nameAr: string; count: number }>;
  priceRange: { min: number; max: number };
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  total?: number;
  facets?: SearchFacets;
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
