import { apiClient } from "../api-client";
import type { ProductListItem } from "@/types/product";

export interface SearchFilters {
  q: string;
  categoryId?: string;
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  limit?: number;
  offset?: number;
}

export interface SearchSuggestion {
  type: "product" | "category" | "brand";
  textEn: string;
  textAr: string;
  url: string;
}

export async function fetchSearchResults(filters: SearchFilters) {
  const params: Record<string, string | number | boolean | undefined> = {
    q: filters.q,
    category_id: filters.categoryId,
    price_min: filters.priceMin,
    price_max: filters.priceMax,
    in_stock: filters.inStock,
    sort: filters.sort,
    limit: filters.limit,
    offset: filters.offset,
  };
  // brand[] needs special handling — pass comma-separated for now,
  // or use multiple params via URLSearchParams if apiClient doesn't support arrays
  if (filters.brands?.length) {
    params.brand = filters.brands.join(",");
  }

  const res = await apiClient.get<ProductListItem[]>("/search", params);
  if (!res.success) throw new Error(res.error?.message ?? "Search failed");
  return res;
}

export async function fetchSuggestions(q: string) {
  const res = await apiClient.get<{ suggestions: SearchSuggestion[] }>("/search/suggest", { q });
  if (!res.success) throw new Error(res.error?.message ?? "Suggestions failed");
  return res;
}
