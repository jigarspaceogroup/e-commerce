import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock env config to avoid process.exit on missing env vars
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

// Mock auth service to return valid token payload
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
    set: vi.fn(),
    del: vi.fn(),
  }),
  createRedisClient: vi.fn(),
  rateLimitCheck: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 99,
    resetAt: Date.now() + 60000,
  }),
}));

// Mock product-sync
vi.mock("../../jobs/product-sync.js", () => ({
  enqueueProductIndex: vi.fn().mockResolvedValue(undefined),
  enqueueProductDelete: vi.fn().mockResolvedValue(undefined),
  createProductSyncQueue: vi.fn(),
  getProductSyncQueue: vi.fn(),
  createProductSyncWorker: vi.fn(),
}));

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productImage: {
      findUnique: vi.fn(),
    },
    slugRedirect: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";

const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440001";
const PRODUCT_ID = "660e8400-e29b-41d4-a716-446655440001";
const VARIANT_ID = "770e8400-e29b-41d4-a716-446655440001";

const sampleCategory = {
  id: CATEGORY_ID,
  nameEn: "Electronics",
  nameAr: "إلكترونيات",
  slug: "electronics",
};

const sampleProduct = {
  id: PRODUCT_ID,
  titleEn: "Test Product",
  titleAr: "منتج تجريبي",
  descriptionEn: "A test product description",
  descriptionAr: "وصف منتج تجريبي",
  basePrice: 99.99,
  compareAtPrice: null,
  brand: "TestBrand",
  slug: "test-product",
  categoryId: CATEGORY_ID,
  status: "draft",
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: sampleCategory,
  variants: [],
  images: [],
};

const sampleVariant = {
  id: VARIANT_ID,
  productId: PRODUCT_ID,
  sku: "TEST-SKU-001",
  priceOverride: null,
  stockQuantity: 10,
  safetyStock: 2,
  lowStockThreshold: 5,
  backorderEnabled: false,
  weightOverride: null,
  attributes: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Product API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Admin: Create ─────────────────────────────────────────────────────────

  describe("POST /api/v1/admin/products", () => {
    const validBody = {
      titleEn: "Test Product",
      titleAr: "منتج تجريبي",
      descriptionEn: "A test product description",
      descriptionAr: "وصف منتج تجريبي",
      basePrice: 99.99,
      slug: "test-product",
      categoryId: CATEGORY_ID,
    };

    it("creates product and returns 201", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // slug check
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(sampleCategory as any); // category verify
      vi.mocked(prisma.product.create).mockResolvedValueOnce(sampleProduct as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/admin/products")
        .set("Authorization", AUTH_HEADER)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe("Test Product");
    });

    it("returns 400 for duplicate slug", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(sampleProduct as any);

      const res = await request(app)
        .post("/api/v1/admin/products")
        .set("Authorization", AUTH_HEADER)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for invalid category", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // slug ok
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null); // category missing

      const res = await request(app)
        .post("/api/v1/admin/products")
        .set("Authorization", AUTH_HEADER)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Admin: List ───────────────────────────────────────────────────────────

  describe("GET /api/v1/admin/products", () => {
    it("returns paginated products", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([sampleProduct] as any);

      const res = await request(app)
        .get("/api/v1/admin/products")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  // ─── Admin: Get by ID ─────────────────────────────────────────────────────

  describe("GET /api/v1/admin/products/:id", () => {
    it("returns product with includes", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(sampleProduct as any);

      const res = await request(app)
        .get(`/api/v1/admin/products/${PRODUCT_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe("Test Product");
    });
  });

  // ─── Admin: Update ─────────────────────────────────────────────────────────

  describe("PATCH /api/v1/admin/products/:id", () => {
    it("updates product", async () => {
      const updated = { ...sampleProduct, titleEn: "Updated Product" };
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(sampleProduct as any); // existing
      vi.mocked(prisma.product.update).mockResolvedValueOnce(updated as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .patch(`/api/v1/admin/products/${PRODUCT_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({ titleEn: "Updated Product" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.titleEn).toBe("Updated Product");
    });
  });

  // ─── Admin: Publish ────────────────────────────────────────────────────────

  describe("POST /api/v1/admin/products/:id/publish", () => {
    it("publishes product when requirements met", async () => {
      const publishable = {
        ...sampleProduct,
        variants: [sampleVariant],
        _count: { images: 1 },
      };
      const published = { ...sampleProduct, status: "published" };

      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(publishable as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce(published as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post(`/api/v1/admin/products/${PRODUCT_ID}/publish`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("published");
    });

    it("returns 400 when missing requirements", async () => {
      const unpublishable = {
        ...sampleProduct,
        variants: [],
        _count: { images: 0 },
      };
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(unpublishable as any);

      const res = await request(app)
        .post(`/api/v1/admin/products/${PRODUCT_ID}/publish`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Admin: Archive ────────────────────────────────────────────────────────

  describe("POST /api/v1/admin/products/:id/archive", () => {
    it("archives product", async () => {
      const archived = { ...sampleProduct, status: "archived" };
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(sampleProduct as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce(archived as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post(`/api/v1/admin/products/${PRODUCT_ID}/archive`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("archived");
    });
  });

  // ─── Admin: Soft Delete ────────────────────────────────────────────────────

  describe("DELETE /api/v1/admin/products/:id", () => {
    it("soft-deletes and returns 204", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(sampleProduct as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        ...sampleProduct,
        deletedAt: new Date(),
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .delete(`/api/v1/admin/products/${PRODUCT_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(204);
    });
  });

  // ─── Admin: Variant sub-routes ─────────────────────────────────────────────

  describe("POST /api/v1/admin/products/:id/variants", () => {
    it("creates variant and returns 201", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(sampleProduct as any); // product exists
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(null); // sku unique
      vi.mocked(prisma.productVariant.create).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post(`/api/v1/admin/products/${PRODUCT_ID}/variants`)
        .set("Authorization", AUTH_HEADER)
        .send({ sku: "TEST-SKU-001" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sku).toBe("TEST-SKU-001");
    });
  });

  // ─── Auth enforcement ──────────────────────────────────────────────────────

  describe("Auth enforcement", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/v1/admin/products");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
    });
  });

  // ─── Public routes ─────────────────────────────────────────────────────────

  describe("GET /api/v1/products (public)", () => {
    it("returns published products only", async () => {
      const publishedProduct = { ...sampleProduct, status: "published" };
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([publishedProduct] as any);

      const res = await request(app).get("/api/v1/products");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe("GET /api/v1/products/:slug (public)", () => {
    it("returns product by slug", async () => {
      const published = { ...sampleProduct, status: "published" };
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(published as any);

      const res = await request(app).get("/api/v1/products/test-product");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe("test-product");
    });

    it("returns 301 redirect for old slug", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // product not found
      vi.mocked(prisma.slugRedirect.findUnique).mockResolvedValueOnce({
        id: "550e8400-e29b-41d4-a716-446655440060",
        entityType: "product",
        oldSlug: "old-product",
        newSlug: "test-product",
        createdAt: new Date(),
      } as any);

      const res = await request(app).get("/api/v1/products/old-product");

      expect(res.status).toBe(301);
      expect(res.headers.location).toBe("/api/v1/products/test-product");
    });
  });
});
