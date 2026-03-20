import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock env config
vi.mock("../../config/env.js", () => ({
  env: {
    NODE_ENV: "development",
    PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    MEILISEARCH_HOST: "http://localhost:7700",
    MEILISEARCH_API_KEY: "test-key",
  },
}));

// Mock auth service (returns admin with search:manage permission)
vi.mock("../../services/auth.js", () => ({
  verifyAccessToken: vi.fn().mockReturnValue({
    sub: "admin-user-id",
    email: "admin@test.com",
    permissions: ["*"],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
}));

// Mock Redis
vi.mock("../../services/redis.js", () => ({
  getRedisClient: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn(),
  }),
  createRedisClient: vi.fn(),
  rateLimitCheck: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 99,
    resetAt: Date.now() + 60000,
  }),
}));

// Mock Meilisearch
vi.mock("../../services/search.js", () => {
  const mockSearch = vi.fn();
  const mockUpdateSynonyms = vi.fn();

  return {
    getSearchClient: vi.fn(() => ({
      index: vi.fn(() => ({
        search: mockSearch,
        updateSynonyms: mockUpdateSynonyms,
      })),
    })),
    createSearchClient: vi.fn(),
    mockSearch,
    mockUpdateSynonyms,
  };
});

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    searchSynonym: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { getSearchClient } from "../../services/search.js";

// Get mock functions from the mocked module
const mockSearchClient = getSearchClient() as any;
const mockSearch = mockSearchClient.index().search as ReturnType<typeof vi.fn>;
const mockUpdateSynonyms = mockSearchClient.index().updateSynonyms as ReturnType<typeof vi.fn>;

const AUTH_HEADER = "Bearer valid-token";

const PRODUCT_ID = "660e8400-e29b-41d4-a716-446655440001";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440001";

const sampleProduct = {
  id: PRODUCT_ID,
  titleEn: "Test Product",
  titleAr: "منتج تجريبي",
  descriptionEn: "A test product",
  descriptionAr: "وصف منتج",
  basePrice: 99.99,
  compareAtPrice: null,
  brand: "Nike",
  slug: "test-product",
  categoryId: CATEGORY_ID,
  status: "published",
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: {
    id: CATEGORY_ID,
    nameEn: "Electronics",
    nameAr: "إلكترونيات",
    slug: "electronics",
  },
  variants: [
    {
      id: "770e8400-e29b-41d4-a716-446655440001",
      priceOverride: null,
      stockQuantity: 10,
      attributes: { size: "M" },
    },
  ],
  images: [
    {
      id: "880e8400-e29b-41d4-a716-446655440001",
      url: "https://example.com/image.jpg",
      altTextEn: "Product image",
      altTextAr: "صورة المنتج",
      sortOrder: 0,
    },
  ],
};

const sampleCategory = {
  id: CATEGORY_ID,
  nameEn: "Electronics",
  nameAr: "إلكترونيات",
};

describe("Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Public Search ─────────────────────────────────────────────────────────

  describe("GET /api/v1/search", () => {
    const mockSearchResult = {
      hits: [{ id: PRODUCT_ID, titleEn: "Test Product", titleAr: "منتج تجريبي" }],
      estimatedTotalHits: 1,
      facetDistribution: {
        brand: { Nike: 5 },
        categoryId: { [CATEGORY_ID]: 3 },
      },
      facetStats: {
        basePrice: { min: 10, max: 100 },
      },
    };

    it("returns 200 with products array and meta", async () => {
      mockSearch.mockResolvedValueOnce(mockSearchResult);
      vi.mocked(prisma.product.findMany)
        .mockResolvedValueOnce([sampleProduct] as any)
        .mockResolvedValueOnce([]); // no products for facet enrichment
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app).get("/api/v1/search?q=test");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.query).toBe("test");
      expect(res.body.meta.total).toBe(1);
    });

    it("filters by category_id", async () => {
      mockSearch.mockResolvedValueOnce(mockSearchResult);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([sampleProduct] as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app).get(`/api/v1/search?q=test&category_id=${CATEGORY_ID}`);

      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          filter: expect.arrayContaining([`categoryId = "${CATEGORY_ID}"`]),
        })
      );
    });

    it("filters by brand", async () => {
      mockSearch.mockResolvedValueOnce(mockSearchResult);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([sampleProduct] as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app).get("/api/v1/search?q=test&brand=Nike");

      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          filter: expect.arrayContaining([expect.stringContaining('brand = "Nike"')]),
        })
      );
    });

    it("filters by price range", async () => {
      mockSearch.mockResolvedValueOnce(mockSearchResult);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([sampleProduct] as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app).get("/api/v1/search?q=test&price_min=10&price_max=100");

      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          filter: expect.arrayContaining(["basePrice >= 10", "basePrice <= 100"]),
        })
      );
    });

    it("sorts by price_asc", async () => {
      mockSearch.mockResolvedValueOnce(mockSearchResult);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([sampleProduct] as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app).get("/api/v1/search?q=test&sort=price_asc");

      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          sort: ["basePrice:asc"],
        })
      );
    });

    it("paginates with limit and offset", async () => {
      mockSearch.mockResolvedValueOnce(mockSearchResult);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([sampleProduct] as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app).get("/api/v1/search?q=test&limit=5&offset=10");

      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          limit: 5,
          offset: 10,
        })
      );
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.meta.offset).toBe(10);
    });

    it("returns 400 when q parameter is missing", async () => {
      const res = await request(app).get("/api/v1/search");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Search Suggestions ────────────────────────────────────────────────────

  describe("GET /api/v1/search/suggest", () => {
    it("returns suggestions", async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [
          {
            id: PRODUCT_ID,
            titleEn: "Test Product",
            titleAr: "منتج تجريبي",
            slug: "test-product",
          },
        ],
      });
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        {
          nameEn: "Electronics",
          nameAr: "إلكترونيات",
          slug: "electronics",
        },
      ] as any);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        { brand: "Nike" },
      ] as any);

      const res = await request(app).get("/api/v1/search/suggest?q=te");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toBeDefined();
      expect(Array.isArray(res.body.data.suggestions)).toBe(true);
    });

    it("returns 400 for query less than 2 characters", async () => {
      const res = await request(app).get("/api/v1/search/suggest?q=a");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Admin: Synonym Management ─────────────────────────────────────────────

  describe("POST /api/v1/admin/search/synonyms", () => {
    it("creates synonym group with auth", async () => {
      const newSynonym = {
        id: "990e8400-e29b-41d4-a716-446655440001",
        words: ["laptop", "notebook", "computer"],
      };
      vi.mocked(prisma.searchSynonym.create).mockResolvedValueOnce({
        ...newSynonym,
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.searchSynonym.findMany).mockResolvedValueOnce([
        { ...newSynonym, createdAt: new Date() },
      ] as any);
      mockUpdateSynonyms.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post("/api/v1/admin/search/synonyms")
        .set("Authorization", AUTH_HEADER)
        .send({ words: ["laptop", "notebook", "computer"] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.words).toEqual(["laptop", "notebook", "computer"]);
      expect(mockUpdateSynonyms).toHaveBeenCalled();
    });

    it("returns 400 for invalid input (less than 2 words)", async () => {
      const res = await request(app)
        .post("/api/v1/admin/search/synonyms")
        .set("Authorization", AUTH_HEADER)
        .send({ words: ["laptop"] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/search/synonyms")
        .send({ words: ["laptop", "notebook"] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/admin/search/synonyms", () => {
    it("lists synonym groups with auth", async () => {
      const synonymGroups = [
        {
          id: "990e8400-e29b-41d4-a716-446655440001",
          words: ["laptop", "notebook"],
          createdAt: new Date(),
        },
      ];
      vi.mocked(prisma.searchSynonym.findMany).mockResolvedValueOnce(synonymGroups as any);

      const res = await request(app)
        .get("/api/v1/admin/search/synonyms")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/search/synonyms");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/v1/admin/search/synonyms/:id", () => {
    it("deletes synonym with auth", async () => {
      const synonymId = "990e8400-e29b-41d4-a716-446655440001";
      vi.mocked(prisma.searchSynonym.delete).mockResolvedValueOnce({
        id: synonymId,
        words: ["laptop", "notebook"],
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.searchSynonym.findMany).mockResolvedValueOnce([]);
      mockUpdateSynonyms.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .delete(`/api/v1/admin/search/synonyms/${synonymId}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUpdateSynonyms).toHaveBeenCalled();
    });

    it("returns 401 without auth", async () => {
      const synonymId = "990e8400-e29b-41d4-a716-446655440001";
      const res = await request(app).delete(`/api/v1/admin/search/synonyms/${synonymId}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
