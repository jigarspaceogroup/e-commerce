import { apiClient } from "../api-client";
import type {
  ProductListItem,
  ProductDetail,
  ProductFilters,
} from "@/types/product";

function parseProductPrices<T extends Record<string, unknown>>(product: T): T {
  const result = { ...product } as Record<string, unknown>;
  if ("basePrice" in result) result.basePrice = Number(result.basePrice);
  if ("compareAtPrice" in result && result.compareAtPrice != null) {
    result.compareAtPrice = Number(result.compareAtPrice);
  }
  return result as T;
}

export async function fetchProducts(
  filters: ProductFilters = {},
): Promise<{ data: ProductListItem[]; hasMore: boolean; nextCursor?: string }> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.categorySlug) params.categorySlug = filters.categorySlug;
  if (filters.priceMin !== undefined) params.priceMin = String(filters.priceMin);
  if (filters.priceMax !== undefined) params.priceMax = String(filters.priceMax);
  if (filters.brand) params.brand = filters.brand;
  if (filters.inStock) params.inStock = "true";
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.cursor) params.cursor = filters.cursor;
  if (filters.limit) params.limit = filters.limit;

  const res = await apiClient.get<ProductListItem[]>("/products", params);
  if (!res.success) throw new Error(res.error?.message ?? "Failed to fetch products");

  return {
    data: res.data.map((p) => parseProductPrices(p as unknown as Record<string, unknown>) as unknown as ProductListItem),
    hasMore: res.meta?.pagination?.hasMore ?? false,
    nextCursor: res.meta?.pagination?.cursor,
  };
}

export async function fetchProductBySlug(
  slug: string,
): Promise<ProductDetail | { redirect: string }> {
  const res = await apiClient.get<ProductDetail | { redirect: string }>(`/products/${slug}`);
  if (!res.success) throw new Error(res.error?.message ?? "Product not found");
  if ("redirect" in res.data) return res.data;
  return parseProductPrices(res.data as unknown as Record<string, unknown>) as unknown as ProductDetail;
}

export function parseFiltersFromParams(
  params: Record<string, string | string[] | undefined>,
): ProductFilters {
  return {
    categoryId: typeof params.categoryId === "string" ? params.categoryId : undefined,
    categorySlug: typeof params.categorySlug === "string" ? params.categorySlug : undefined,
    priceMin: params.priceMin ? Number(params.priceMin) : undefined,
    priceMax: params.priceMax ? Number(params.priceMax) : undefined,
    brand: typeof params.brand === "string" ? params.brand : undefined,
    inStock: params.inStock === "true" ? true : undefined,
    sortBy: (params.sortBy as ProductFilters["sortBy"]) ?? undefined,
    cursor: typeof params.cursor === "string" ? params.cursor : undefined,
    limit: params.limit ? Number(params.limit) : undefined,
  };
}
