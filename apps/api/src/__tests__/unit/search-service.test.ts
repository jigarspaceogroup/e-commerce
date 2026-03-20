import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Meilisearch
const mockIndex = {
  search: vi.fn(),
  updateFilterableAttributes: vi.fn().mockResolvedValue({}),
  updateSortableAttributes: vi.fn().mockResolvedValue({}),
  updateSearchableAttributes: vi.fn().mockResolvedValue({}),
  updateLocalizedAttributes: vi.fn().mockResolvedValue({}),
  updateStopWords: vi.fn().mockResolvedValue({}),
  updateTypoTolerance: vi.fn().mockResolvedValue({}),
};
const mockClient = { index: vi.fn(() => mockIndex) };
vi.mock("../../services/search.js", () => ({
  getSearchClient: () => mockClient,
  initProductIndex: vi.fn(),
}));

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    product: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
  },
}));

// Mock Redis
const mockRedis = { get: vi.fn(), set: vi.fn() };
vi.mock("../../services/redis.js", () => ({
  getRedisClient: () => mockRedis,
}));

import { searchProductsAPI, searchSuggestions } from "../../services/search-api.js";
import { prisma } from "../../lib/prisma.js";

describe("Search Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to default behavior (return undefined)
    vi.mocked(prisma.product.findMany).mockReset();
    vi.mocked(prisma.category.findMany).mockReset();
  });

  // ─── searchProductsAPI ─────────────────────────────────────────────────────
  describe("searchProductsAPI", () => {
    it("returns cached result when Redis has data", async () => {
      const cachedData = {
        success: true,
        data: [{ id: "prod-1", titleEn: "Cached Product" }],
        meta: { total: 1, query: "test", offset: 0, limit: 20, facets: {} },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await searchProductsAPI({ q: "test" });

      expect(result).toEqual(cachedData);
      expect(mockIndex.search).not.toHaveBeenCalled();
      expect(vi.mocked(prisma.product.findMany)).not.toHaveBeenCalled();
    });

    it("queries Meilisearch and enriches with Postgres data", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [{ id: "prod-1" }],
        estimatedTotalHits: 1,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 10, max: 100 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        {
          id: "prod-1",
          titleEn: "Test Product",
          titleAr: "منتج تجريبي",
          slug: "test-product",
          basePrice: 50,
          compareAtPrice: null,
          brand: "TestBrand",
          status: "published",
          category: { id: "cat-1", nameEn: "Category", nameAr: "فئة", slug: "category" },
          variants: [
            { id: "var-1", priceOverride: null, stockQuantity: 10, attributes: {} },
          ],
          images: [
            {
              id: "img-1",
              url: "https://example.com/img.jpg",
              altTextEn: "Image",
              altTextAr: "صورة",
              sortOrder: 1,
            },
          ],
        },
      ] as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      const result = await searchProductsAPI({ q: "test" });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].titleEn).toBe("Test Product");
      expect(result.data[0].variants).toHaveLength(1);
      expect(result.data[0].images).toHaveLength(1);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("passes correct filter array for category + brand + price + inStock", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 0, max: 0 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      await searchProductsAPI({
        q: "laptop",
        categoryId: "cat-electronics",
        brands: ["Dell", "HP"],
        priceMin: 100,
        priceMax: 500,
        inStock: true,
      });

      expect(mockIndex.search).toHaveBeenCalledWith("laptop", {
        filter: [
          'categoryId = "cat-electronics"',
          '(brand = "Dell" OR brand = "HP")',
          "basePrice >= 100",
          "basePrice <= 500",
          "inStock = true",
          'status = "published"',
        ],
        sort: undefined,
        limit: 20,
        offset: 0,
        facets: ["brand", "categoryId", "inStock"],
        attributesToHighlight: ["titleEn", "titleAr"],
        facetStats: ["basePrice"],
      });
    });

    it("maps sort params correctly (price_asc → basePrice:asc, etc.)", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 0, max: 0 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      await searchProductsAPI({ q: "test", sort: "price_asc" });
      expect(mockIndex.search).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({ sort: ["basePrice:asc"] }),
      );

      vi.clearAllMocks();
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 0, max: 0 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      await searchProductsAPI({ q: "test", sort: "price_desc" });
      expect(mockIndex.search).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({ sort: ["basePrice:desc"] }),
      );

      vi.clearAllMocks();
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 0, max: 0 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      await searchProductsAPI({ q: "test", sort: "newest" });
      expect(mockIndex.search).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({ sort: ["createdAt:desc"] }),
      );

      vi.clearAllMocks();
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 0, max: 0 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      await searchProductsAPI({ q: "test", sort: "relevance" });
      expect(mockIndex.search).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({ sort: undefined }),
      );
    });

    it("caches result in Redis with TTL", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 0, max: 0 } },
      });
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

      await searchProductsAPI({ q: "test" });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining("search:"),
        expect.any(String),
        "EX",
        120, // CACHE_TTL = 120 seconds
      );
    });

    it("returns facets (brands, categories, priceRange)", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockIndex.search.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {
          brand: { Dell: 5, HP: 3 },
          categoryId: { "cat-1": 8 },
        },
        facetStats: { basePrice: { min: 99, max: 999 } },
      });

      // Mock category findMany for facet enrichment (called when categoryIds.length > 0)
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { id: "cat-1", nameEn: "Laptops", nameAr: "أجهزة الكمبيوتر المحمولة" },
      ] as any);

      // Note: prisma.product.findMany is NOT called when hits is empty

      const result = await searchProductsAPI({ q: "laptop" });

      expect(result.meta.facets.brands).toEqual([
        { value: "Dell", count: 5 },
        { value: "HP", count: 3 },
      ]);
      expect(result.meta.facets.categories).toEqual([
        { id: "cat-1", nameEn: "Laptops", nameAr: "أجهزة الكمبيوتر المحمولة", count: 8 },
      ]);
      expect(result.meta.facets.priceRange).toEqual({ min: 99, max: 999 });
    });
  });

  // ─── searchSuggestions ─────────────────────────────────────────────────────
  describe("searchSuggestions", () => {
    it("returns grouped suggestions (products + categories + brands)", async () => {
      // Mock Meilisearch search for products
      mockIndex.search.mockResolvedValueOnce({
        hits: [
          { id: "prod-1", titleEn: "Laptop", titleAr: "لابتوب", slug: "laptop" },
          { id: "prod-2", titleEn: "Laptop Pro", titleAr: "لابتوب برو", slug: "laptop-pro" },
        ],
      });

      // Mock Prisma category search
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { nameEn: "Laptops", nameAr: "أجهزة الكمبيوتر المحمولة", slug: "laptops" },
      ] as any);

      // Mock Prisma brand search (distinct products by brand)
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        { brand: "Dell" },
      ] as any);

      const result = await searchSuggestions("laptop");

      expect(result.success).toBe(true);
      expect(result.data.suggestions).toHaveLength(4);
      expect(result.data.suggestions[0].type).toBe("product");
      expect(result.data.suggestions[0].textEn).toBe("Laptop");
      expect(result.data.suggestions[0].url).toBe("/products/laptop");
      expect(result.data.suggestions[2].type).toBe("category");
      expect(result.data.suggestions[2].textEn).toBe("Laptops");
      expect(result.data.suggestions[2].url).toBe("/category/laptops");
      expect(result.data.suggestions[3].type).toBe("brand");
      expect(result.data.suggestions[3].textEn).toBe("Dell");
    });

    it("caps total suggestions at 8", async () => {
      // Mock Meilisearch with 4 products
      mockIndex.search.mockResolvedValueOnce({
        hits: [
          { id: "prod-1", titleEn: "P1", titleAr: "م1", slug: "p1" },
          { id: "prod-2", titleEn: "P2", titleAr: "م2", slug: "p2" },
          { id: "prod-3", titleEn: "P3", titleAr: "م3", slug: "p3" },
          { id: "prod-4", titleEn: "P4", titleAr: "م4", slug: "p4" },
        ],
      });

      // Mock Prisma categories (2 results)
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { nameEn: "C1", nameAr: "ف1", slug: "c1" },
        { nameEn: "C2", nameAr: "ف2", slug: "c2" },
      ] as any);

      // Mock Prisma brands (2 results)
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        { brand: "B1" },
        { brand: "B2" },
      ] as any);

      const result = await searchSuggestions("test");

      expect(result.data.suggestions).toHaveLength(8);
    });
  });
});
