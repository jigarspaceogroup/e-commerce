import { apiClient } from "../api-client";
import type { CategoryTreeNode, CategoryDetail } from "@/types/product";

export async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  const res = await apiClient.get<CategoryTreeNode[]>("/categories");
  if (!res.success) throw new Error(res.error?.message ?? "Failed to fetch categories");
  return res.data;
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<CategoryDetail | { redirect: string }> {
  const res = await apiClient.get<CategoryDetail | { redirect: string }>(`/categories/${slug}`);
  if (!res.success) throw new Error(res.error?.message ?? "Category not found");
  return res.data;
}
