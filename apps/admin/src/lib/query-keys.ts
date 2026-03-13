export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (filters: Record<string, unknown>) =>
      ["products", "list", filters] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  },
  categories: {
    all: ["categories"] as const,
    tree: () => ["categories", "tree"] as const,
    detail: (id: string) => ["categories", "detail", id] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    list: (filters: Record<string, unknown>) =>
      ["inventory", "list", filters] as const,
    summary: () => ["inventory", "summary"] as const,
  },
  customers: {
    all: ["customers"] as const,
    list: (filters: Record<string, unknown>) =>
      ["customers", "list", filters] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
  },
};
