import { MeiliSearch, type Index } from "meilisearch";

let searchClient: MeiliSearch | null = null;

const PRODUCT_INDEX = "products";

export function createSearchClient(host: string, apiKey: string): MeiliSearch {
  searchClient = new MeiliSearch({ host, apiKey });
  return searchClient;
}

export function getSearchClient(): MeiliSearch {
  if (!searchClient) {
    throw new Error("Search client not initialized. Call createSearchClient first.");
  }
  return searchClient;
}

export async function searchHealthCheck(): Promise<boolean> {
  try {
    const client = getSearchClient();
    const health = await client.health();
    return health.status === "available";
  } catch {
    return false;
  }
}

export async function initProductIndex(): Promise<Index> {
  const client = getSearchClient();
  const index = client.index(PRODUCT_INDEX);

  await client.createIndex(PRODUCT_INDEX, { primaryKey: "id" }).catch(() => {
    // Index may already exist
  });

  await index.updateFilterableAttributes([
    "categoryId",
    "brand",
    "status",
    "basePrice",
    "averageRating",
    "inStock",
  ]);

  await index.updateSortableAttributes([
    "basePrice",
    "createdAt",
    "averageRating",
  ]);

  await index.updateSearchableAttributes([
    "titleAr",
    "titleEn",
    "descriptionAr",
    "descriptionEn",
    "brand",
    "sku",
  ]);

  return index;
}

export interface ProductSearchDocument {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  brand: string | null;
  slug: string;
  status: string;
  categoryId: string;
  averageRating: number;
  inStock: boolean;
  sku: string;
  createdAt: string;
}

export async function indexProducts(products: ProductSearchDocument[]): Promise<void> {
  const client = getSearchClient();
  const index = client.index(PRODUCT_INDEX);
  await index.addDocuments(products);
}

export async function removeProductFromIndex(productId: string): Promise<void> {
  const client = getSearchClient();
  const index = client.index(PRODUCT_INDEX);
  await index.deleteDocument(productId);
}

export async function searchProducts(
  query: string,
  options?: {
    filter?: string[];
    sort?: string[];
    limit?: number;
    offset?: number;
  },
) {
  const client = getSearchClient();
  const index = client.index(PRODUCT_INDEX);

  return index.search(query, {
    filter: options?.filter,
    sort: options?.sort,
    limit: options?.limit ?? 20,
    offset: options?.offset ?? 0,
  });
}
