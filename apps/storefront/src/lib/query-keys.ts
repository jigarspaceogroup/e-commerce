import type { ProductFilters } from "@/types/product";

export const queryKeys = {
  categories: {
    all: ["categories"] as const,
    tree: () => ["categories", "tree"] as const,
    bySlug: (slug: string) => ["categories", "slug", slug] as const,
  },
  products: {
    all: ["products"] as const,
    list: (filters: ProductFilters) => ["products", "list", filters] as const,
    bySlug: (slug: string) => ["products", "slug", slug] as const,
  },
};
