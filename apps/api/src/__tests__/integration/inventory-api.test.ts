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
    productVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";

const VARIANT_ID = "550e8400-e29b-41d4-a716-446655440001";
const PRODUCT_ID = "660e8400-e29b-41d4-a716-446655440001";
const MISSING_VARIANT_ID = "550e8400-e29b-41d4-a716-446655440099";

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
  product: {
    id: PRODUCT_ID,
    titleEn: "Test Product",
    titleAr: "منتج تجريبي",
    status: "published",
  },
};

describe("Inventory API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  describe("GET /api/v1/admin/inventory/summary", () => {
    it("returns inventory counts", async () => {
      vi.mocked(prisma.productVariant.count)
        .mockResolvedValueOnce(100 as any)  // total
        .mockResolvedValueOnce(80 as any)   // inStock
        .mockResolvedValueOnce(5 as any);   // outOfStock
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ count: BigInt(15) }] as any); // lowStock

      const res = await request(app)
        .get("/api/v1/admin/inventory/summary")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("total");
      expect(res.body.data).toHaveProperty("inStock");
      expect(res.body.data).toHaveProperty("lowStock");
      expect(res.body.data).toHaveProperty("outOfStock");
    });
  });

  // ─── List ──────────────────────────────────────────────────────────────────

  describe("GET /api/v1/admin/inventory", () => {
    it("returns paginated inventory list", async () => {
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce([sampleVariant] as any);

      const res = await request(app)
        .get("/api/v1/admin/inventory")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  // ─── Low Stock ─────────────────────────────────────────────────────────────

  describe("GET /api/v1/admin/inventory/low-stock", () => {
    it("returns low-stock items", async () => {
      const lowStockVariant = {
        ...sampleVariant,
        stockQuantity: 3,
        lowStockThreshold: 5,
      };
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce([lowStockVariant] as any);

      const res = await request(app)
        .get("/api/v1/admin/inventory/low-stock")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Update Stock ──────────────────────────────────────────────────────────

  describe("PATCH /api/v1/admin/inventory/:variantId", () => {
    it("updates stock and creates movement", async () => {
      const updated = { ...sampleVariant, stockQuantity: 25 };
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([updated] as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .patch(`/api/v1/admin/inventory/${VARIANT_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({
          stockQuantity: 25,
          reason: "received_shipment",
          notes: "New shipment arrived",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stockQuantity).toBe(25);
    });

    it("returns 404 for missing variant", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`/api/v1/admin/inventory/${MISSING_VARIANT_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({
          stockQuantity: 25,
          reason: "received_shipment",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Auth enforcement ──────────────────────────────────────────────────────

  describe("Auth enforcement", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/v1/admin/inventory");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
    });
  });
});
