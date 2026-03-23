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
  search: {
    all: ["search"] as const,
    results: (filters: Record<string, unknown>) => ["search", "results", filters] as const,
    suggestions: (q: string) => ["search", "suggestions", q] as const,
  },
  cart: {
    all: ["cart"] as const,
    current: () => ["cart", "current"] as const,
  },
  profile: {
    all: ["profile"] as const,
    me: () => ["profile", "me"] as const,
    addresses: () => ["profile", "addresses"] as const,
  },
};
