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

// Seeded product data for Prisma enrichment
const products = [
  {
    id: "p1",
    titleEn: "Samsung Galaxy S24",
    titleAr: "سامسونج جالاكسي إس24",
    slug: "samsung-galaxy-s24",
    basePrice: "3999.00",
    compareAtPrice: null,
    brand: "Samsung",
    status: "published",
    categoryId: "cat-electronics",
    deletedAt: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    images: [
      {
        id: "img1",
        url: "/img/s24.jpg",
        altTextEn: "Samsung Galaxy",
        altTextAr: "سامسونج جالاكسي",
        sortOrder: 0,
      },
    ],
    variants: [
      {
        id: "v1",
        priceOverride: null,
        stockQuantity: 50,
        attributes: { color: "Black" },
        createdAt: new Date("2024-01-15"),
      },
    ],
    category: {
      id: "cat-electronics",
      nameEn: "Electronics",
      nameAr: "إلكترونيات",
      slug: "electronics",
    },
  },
  {
    id: "p2",
    titleEn: "iPhone 16 Pro",
    titleAr: "آيفون 16 برو",
    slug: "iphone-16-pro",
    basePrice: "4499.00",
    compareAtPrice: null,
    brand: "Apple",
    status: "published",
    categoryId: "cat-electronics",
    deletedAt: null,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    images: [
      {
        id: "img2",
        url: "/img/ip16.jpg",
        altTextEn: "iPhone 16",
        altTextAr: "آيفون 16",
        sortOrder: 0,
      },
    ],
    variants: [
      {
        id: "v2",
        priceOverride: null,
        stockQuantity: 30,
        attributes: { color: "Silver" },
        createdAt: new Date("2024-02-01"),
      },
    ],
    category: {
      id: "cat-electronics",
      nameEn: "Electronics",
      nameAr: "إلكترونيات",
      slug: "electronics",
    },
  },
  {
    id: "p3",
    titleEn: "Nike Air Max",
    titleAr: "نايك اير ماكس",
    slug: "nike-air-max",
    basePrice: "599.00",
    compareAtPrice: null,
    brand: "Nike",
    status: "published",
    categoryId: "cat-shoes",
    deletedAt: null,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    images: [
      {
        id: "img3",
        url: "/img/airmax.jpg",
        altTextEn: "Nike Air Max",
        altTextAr: "نايك اير ماكس",
        sortOrder: 0,
      },
    ],
    variants: [
      {
        id: "v3",
        priceOverride: null,
        stockQuantity: 100,
        attributes: { size: "42" },
        createdAt: new Date("2024-01-20"),
      },
    ],
    category: {
      id: "cat-shoes",
      nameEn: "Shoes",
      nameAr: "أحذية",
      slug: "shoes",
    },
  },
];

const categories = [
  {
    id: "cat-electronics",
    nameEn: "Electronics",
    nameAr: "إلكترونيات",
    slug: "electronics",
  },
  {
    id: "cat-shoes",
    nameEn: "Shoes",
    nameAr: "أحذية",
    slug: "shoes",
  },
];

// Mock Meilisearch with intelligent query-based responses
const mockSearch = vi.fn().mockImplementation((query: string, opts?: any) => {
  const makeResult = (hits: any[], totalHits?: number) => ({
    hits,
    estimatedTotalHits: totalHits ?? hits.length,
    facetDistribution: {
      brand: { Samsung: 1, Apple: 1, Nike: 1 },
      categoryId: { "cat-electronics": 2, "cat-shoes": 1 },
      inStock: { true: 3 },
    },
    facetStats: { basePrice: { min: 599, max: 4499 } },
  });

  // Arabic search for "phone" (هاتف)
  if (query === "هاتف") {
    return Promise.resolve(
      makeResult([
        {
          id: "p1",
          titleEn: "Samsung Galaxy S24",
          titleAr: "سامسونج جالاكسي إس24",
        },
        {
          id: "p2",
          titleEn: "iPhone 16 Pro",
          titleAr: "آيفون 16 برو",
        },
      ])
    );
  }

  // English search for "phone"
  if (query === "phone") {
    return Promise.resolve(
      makeResult([
        {
          id: "p1",
          titleEn: "Samsung Galaxy S24",
          titleAr: "سامسونج جالاكسي إس24",
        },
        {
          id: "p2",
          titleEn: "iPhone 16 Pro",
          titleAr: "آيفون 16 برو",
        },
      ])
    );
  }

  // Typo tolerance - "samung" should still return Samsung
  if (query === "samung") {
    return Promise.resolve(
      makeResult([
        {
          id: "p1",
          titleEn: "Samsung Galaxy S24",
          titleAr: "سامسونج جالاكسي إس24",
        },
      ])
    );
  }

  // Synonym expansion - "smartphone" should return phone products
  if (query === "smartphone") {
    return Promise.resolve(
      makeResult([
        {
          id: "p1",
          titleEn: "Samsung Galaxy S24",
          titleAr: "سامسونج جالاكسي إس24",
        },
        {
          id: "p2",
          titleEn: "iPhone 16 Pro",
          titleAr: "آيفون 16 برو",
        },
      ])
    );
  }

  // Auto-suggest with "sam"
  if (query === "sam") {
    return Promise.resolve({
      hits: [
        {
          id: "p1",
          titleEn: "Samsung Galaxy S24",
          titleAr: "سامسونج جالاكسي إس24",
          slug: "samsung-galaxy-s24",
        },
      ],
      estimatedTotalHits: 1,
    });
  }

  // Default: return all products
  return Promise.resolve(
    makeResult([
      { id: "p1", titleEn: "Samsung Galaxy S24", titleAr: "سامسونج جالاكسي إس24" },
      { id: "p2", titleEn: "iPhone 16 Pro", titleAr: "آيفون 16 برو" },
      { id: "p3", titleEn: "Nike Air Max", titleAr: "نايك اير ماكس" },
    ])
  );
});

const mockUpdateSynonyms = vi.fn().mockResolvedValue(undefined);

vi.mock("../../services/search.js", () => ({
  getSearchClient: vi.fn(() => ({
    index: vi.fn(() => ({
      search: mockSearch,
      updateSynonyms: mockUpdateSynonyms,
    })),
  })),
  createSearchClient: vi.fn(),
}));

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
import { getRedisClient } from "../../services/redis.js";

const AUTH_HEADER = "Bearer valid-token";

describe("Search E2E Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Arabic search", () => {
    it("returns Arabic products for Arabic query", async () => {
      // Mock Prisma to return enriched products
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=هاتف");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(mockSearch).toHaveBeenCalledWith("هاتف", expect.any(Object));

      // Verify Arabic titles are present
      expect(res.body.data[0].titleAr).toBeDefined();
    });
  });

  describe("English search", () => {
    it("returns English products for English query", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=phone");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(mockSearch).toHaveBeenCalledWith("phone", expect.any(Object));

      // Verify English titles are present
      expect(res.body.data[0].titleEn).toBeDefined();
    });
  });

  describe("Typo tolerance", () => {
    it("returns Samsung products for misspelled 'samung'", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=samung");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Meilisearch handles typo tolerance internally
      expect(mockSearch).toHaveBeenCalledWith("samung", expect.any(Object));

      // Verify we got Samsung product
      expect(res.body.data[0].titleEn).toContain("Samsung");
    });
  });

  describe("Synonym expansion", () => {
    it("creates synonym group and searches with expanded term", async () => {
      // Step 1: Create synonym group
      const synonymData = {
        id: "syn-1",
        words: ["mobile", "phone", "smartphone"],
        createdAt: new Date(),
      };

      vi.mocked(prisma.searchSynonym.create).mockResolvedValueOnce(synonymData as any);
      vi.mocked(prisma.searchSynonym.findMany).mockResolvedValueOnce([synonymData] as any);

      const createRes = await request(app)
        .post("/api/v1/admin/search/synonyms")
        .set("Authorization", AUTH_HEADER)
        .send({ words: ["mobile", "phone", "smartphone"] });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.words).toEqual(["mobile", "phone", "smartphone"]);
      expect(mockUpdateSynonyms).toHaveBeenCalled();

      // Step 2: Search with synonym term "smartphone"
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const searchRes = await request(app).get("/api/v1/search?q=smartphone");

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data.length).toBeGreaterThan(0);
      expect(mockSearch).toHaveBeenCalledWith("smartphone", expect.any(Object));
    });
  });

  describe("Combo filters", () => {
    it("searches with category + price + brand combo", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get(
        "/api/v1/search?q=phone&brand=Samsung&price_min=1000&price_max=5000"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify filters were passed to Meilisearch
      expect(mockSearch).toHaveBeenCalledWith(
        "phone",
        expect.objectContaining({
          filter: expect.arrayContaining([
            expect.stringContaining('brand = "Samsung"'),
            "basePrice >= 1000",
            "basePrice <= 5000",
          ]),
        })
      );
    });

    it("applies multiple brand filters", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get(
        "/api/v1/search?q=phone&brand=Samsung&brand=Apple"
      );

      expect(res.status).toBe(200);

      // Verify OR logic for multiple brands
      expect(mockSearch).toHaveBeenCalledWith(
        "phone",
        expect.objectContaining({
          filter: expect.arrayContaining([
            expect.stringContaining('brand = "Samsung" OR brand = "Apple"'),
          ]),
        })
      );
    });
  });

  describe("Sort options", () => {
    it.each([
      ["price_asc", ["basePrice:asc"]],
      ["price_desc", ["basePrice:desc"]],
      ["newest", ["createdAt:desc"]],
    ])("sort=%s passes correct Meilisearch sort", async (sort, expectedSort) => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      await request(app).get(`/api/v1/search?q=test&sort=${sort}`);

      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({ sort: expectedSort })
      );
    });

    it("defaults to relevance (no sort parameter)", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      await request(app).get("/api/v1/search?q=test&sort=relevance");

      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({ sort: undefined })
      );
    });
  });

  describe("Auto-suggest", () => {
    it("returns grouped suggestions for 'sam'", async () => {
      // Mock category search
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      // Mock brand search
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        { brand: "Samsung" },
      ] as any);

      const res = await request(app).get("/api/v1/search/suggest?q=sam");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toBeDefined();
      expect(Array.isArray(res.body.data.suggestions)).toBe(true);
      expect(res.body.data.suggestions.length).toBeLessThanOrEqual(8);

      // Verify product suggestions are included
      const productSuggestion = res.body.data.suggestions.find(
        (s: any) => s.type === "product"
      );
      expect(productSuggestion).toBeDefined();
    });

    it("returns 400 for query less than 2 characters", async () => {
      const res = await request(app).get("/api/v1/search/suggest?q=a");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("limits suggestions to 8 total items", async () => {
      // Mock extensive results
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { nameEn: "Electronics", nameAr: "إلكترونيات", slug: "electronics" },
        { nameEn: "Shoes", nameAr: "أحذية", slug: "shoes" },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        { brand: "Samsung" },
        { brand: "Sony" },
      ] as any);

      const res = await request(app).get("/api/v1/search/suggest?q=sam");

      expect(res.status).toBe(200);
      expect(res.body.data.suggestions.length).toBeLessThanOrEqual(8);
    });
  });

  describe("Facets", () => {
    it("returns facet counts in search response", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1], products[2]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        categories as any
      );

      const res = await request(app).get("/api/v1/search?q=test");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.facets).toBeDefined();

      // Verify brand facets
      expect(res.body.meta.facets.brands).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: expect.any(String),
            count: expect.any(Number)
          }),
        ])
      );

      // Verify category facets with names
      expect(res.body.meta.facets.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            nameEn: expect.any(String),
            nameAr: expect.any(String),
            count: expect.any(Number),
          }),
        ])
      );

      // Verify price range facets
      expect(res.body.meta.facets.priceRange).toEqual({
        min: expect.any(Number),
        max: expect.any(Number),
      });
      expect(res.body.meta.facets.priceRange.min).toBe(599);
      expect(res.body.meta.facets.priceRange.max).toBe(4499);
    });

    it("enriches category facets with localized names", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=phone");

      expect(res.status).toBe(200);

      // Verify category enrichment was called
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { id: { in: expect.arrayContaining(["cat-electronics"]) } },
        select: { id: true, nameEn: true, nameAr: true },
      });

      const categoryFacet = res.body.meta.facets.categories.find(
        (c: any) => c.id === "cat-electronics"
      );
      expect(categoryFacet).toEqual({
        id: "cat-electronics",
        nameEn: "Electronics",
        nameAr: "إلكترونيات",
        count: 2,
      });
    });
  });

  describe("Pagination", () => {
    it("respects limit and offset parameters", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=test&limit=5&offset=10");

      expect(res.status).toBe(200);

      // Verify pagination passed to Meilisearch
      expect(mockSearch).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          limit: 5,
          offset: 10,
        })
      );

      // Verify pagination in response meta
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.meta.offset).toBe(10);
    });
  });

  describe("Product enrichment", () => {
    it("enriches search results with full product data", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=samsung");

      expect(res.status).toBe(200);

      const product = res.body.data[0];

      // Verify full product structure
      expect(product).toMatchObject({
        id: "p1",
        titleEn: "Samsung Galaxy S24",
        titleAr: "سامسونج جالاكسي إس24",
        slug: "samsung-galaxy-s24",
        basePrice: 3999,
        brand: "Samsung",
        status: "published",
      });

      // Verify images
      expect(product.images).toHaveLength(1);
      expect(product.images[0]).toMatchObject({
        id: "img1",
        url: "/img/s24.jpg",
        altTextEn: "Samsung Galaxy",
        altTextAr: "سامسونج جالاكسي",
        sortOrder: 0,
      });

      // Verify variants
      expect(product.variants).toHaveLength(1);
      expect(product.variants[0]).toMatchObject({
        id: "v1",
        priceOverride: null,
        stockQuantity: 50,
        attributes: { color: "Black" },
      });

      // Verify category
      expect(product.category).toMatchObject({
        id: "cat-electronics",
        nameEn: "Electronics",
        nameAr: "إلكترونيات",
        slug: "electronics",
      });
    });

    it("maintains Meilisearch relevance order", async () => {
      // Mock Meilisearch returning products in specific order
      mockSearch.mockResolvedValueOnce({
        hits: [
          { id: "p2", titleEn: "iPhone 16 Pro" },
          { id: "p1", titleEn: "Samsung Galaxy S24" },
        ],
        estimatedTotalHits: 2,
        facetDistribution: { brand: {}, categoryId: {} },
        facetStats: { basePrice: { min: 3999, max: 4499 } },
      });

      // Prisma returns in different order
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0], products[1]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      const res = await request(app).get("/api/v1/search?q=phone");

      expect(res.status).toBe(200);

      // Verify order matches Meilisearch (iPhone first, Samsung second)
      expect(res.body.data[0].id).toBe("p2");
      expect(res.body.data[1].id).toBe("p1");
    });
  });

  describe("Cache integration", () => {
    it("bypasses cache on first request and sets cache", async () => {
      const mockRedis = getRedisClient();
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
      vi.mocked(mockRedis.set).mockResolvedValueOnce("OK");

      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        [products[0]] as any
      );
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(
        [categories[0]] as any
      );

      await request(app).get("/api/v1/search?q=test");

      // Verify cache was checked and set
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^search:/),
        expect.any(String),
        "EX",
        120
      );
    });
  });

  describe("Error handling", () => {
    it("returns 400 when query parameter is missing", async () => {
      const res = await request(app).get("/api/v1/search");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for invalid price_min", async () => {
      const res = await request(app).get("/api/v1/search?q=test&price_min=-100");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
