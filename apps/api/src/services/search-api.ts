import { getSearchClient } from "./search.js";
import { prisma } from "../lib/prisma.js";
import { getRedisClient } from "./redis.js";
import crypto from "crypto";

const PRODUCT_INDEX = "products";
const CACHE_TTL = 120; // 2 minutes

interface SearchParams {
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

function buildFilterString(params: SearchParams): string[] {
  const filters: string[] = [];
  if (params.categoryId) filters.push(`categoryId = "${params.categoryId}"`);
  if (params.brands?.length) {
    const brandFilters = params.brands.map((b) => `brand = "${b}"`).join(" OR ");
    filters.push(`(${brandFilters})`);
  }
  if (params.priceMin !== undefined) filters.push(`basePrice >= ${params.priceMin}`);
  if (params.priceMax !== undefined) filters.push(`basePrice <= ${params.priceMax}`);
  if (params.inStock !== undefined) filters.push(`inStock = ${params.inStock}`);
  filters.push('status = "published"');
  return filters;
}

function buildSort(sort?: string): string[] | undefined {
  switch (sort) {
    case "price_asc": return ["basePrice:asc"];
    case "price_desc": return ["basePrice:desc"];
    case "newest": return ["createdAt:desc"];
    default: return undefined; // relevance = Meilisearch default
  }
}

function cacheKey(params: SearchParams): string {
  const hash = crypto.createHash("md5").update(JSON.stringify(params)).digest("hex");
  return `search:${hash}`;
}

export async function searchProductsAPI(params: SearchParams) {
  // Check cache
  const redis = getRedisClient();
  const key = cacheKey(params);
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Search Meilisearch
  const client = getSearchClient();
  const index = client.index(PRODUCT_INDEX);

  const result = await index.search(params.q, {
    filter: buildFilterString(params),
    sort: buildSort(params.sort),
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    facets: ["brand", "categoryId", "inStock"],
    attributesToHighlight: ["titleEn", "titleAr"],
    facetStats: ["basePrice"],
  });

  // Enrich with Postgres data (images, variants)
  const productIds = result.hits.map((h: any) => h.id as string);
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { orderBy: { createdAt: "asc" } },
          category: { select: { id: true, nameEn: true, nameAr: true, slug: true } },
        },
      })
    : [];

  // Maintain Meilisearch relevance order
  const productMap = new Map(products.map((p) => [p.id, p]));
  const data = productIds
    .map((id) => productMap.get(id))
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      brand: p.brand,
      status: p.status,
      category: p.category,
      variants: p.variants.map((v: any) => ({
        id: v.id,
        priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        stockQuantity: v.stockQuantity,
        attributes: v.attributes,
      })),
      images: p.images.map((img: any) => ({
        id: img.id,
        url: img.url,
        altTextEn: img.altTextEn,
        altTextAr: img.altTextAr,
        sortOrder: img.sortOrder,
      })),
    }));

  // Build facets response
  const brandFacets = result.facetDistribution?.brand
    ? Object.entries(result.facetDistribution.brand).map(([value, count]) => ({ value, count: count as number }))
    : [];

  const categoryIds = result.facetDistribution?.categoryId
    ? Object.keys(result.facetDistribution.categoryId)
    : [];
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, nameEn: true, nameAr: true },
      })
    : [];
  const categoryFacets = categories.map((c) => ({
    id: c.id,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    count: (result.facetDistribution?.categoryId as any)?.[c.id] ?? 0,
  }));

  const priceRange = {
    min: (result as any).facetStats?.basePrice?.min ?? 0,
    max: (result as any).facetStats?.basePrice?.max ?? 0,
  };

  const response = {
    success: true,
    data,
    meta: {
      total: result.estimatedTotalHits ?? 0,
      query: params.q,
      offset: params.offset ?? 0,
      limit: params.limit ?? 20,
      facets: { brands: brandFacets, categories: categoryFacets, priceRange },
    },
  };

  // Cache result
  await redis.set(key, JSON.stringify(response), "EX", CACHE_TTL);

  return response;
}
