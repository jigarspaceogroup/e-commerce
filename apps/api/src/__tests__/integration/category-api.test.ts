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
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
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
const MISSING_ID = "550e8400-e29b-41d4-a716-446655440099";

const sampleCategory = {
  id: CATEGORY_ID,
  nameEn: "Electronics",
  nameAr: "إلكترونيات",
  slug: "electronics",
  parentId: null,
  descriptionEn: "Electronic devices",
  descriptionAr: "أجهزة إلكترونية",
  materializedPath: "/",
  sortOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  children: [],
  _count: { products: 0 },
};

describe("Category API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Admin routes ──────────────────────────────────────────────────────────

  describe("POST /api/v1/admin/categories", () => {
    const validBody = {
      nameEn: "Electronics",
      nameAr: "إلكترونيات",
      slug: "electronics",
    };

    it("creates category and returns 201", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null); // slug check
      vi.mocked(prisma.category.create).mockResolvedValueOnce(sampleCategory as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/admin/categories")
        .set("Authorization", AUTH_HEADER)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nameEn).toBe("Electronics");
    });

    it("returns 400 for duplicate slug", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(sampleCategory as any);

      const res = await request(app)
        .post("/api/v1/admin/categories")
        .set("Authorization", AUTH_HEADER)
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/admin/categories", () => {
    it("returns categories list", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([sampleCategory] as any);

      const res = await request(app)
        .get("/api/v1/admin/categories")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/admin/categories/:id", () => {
    it("returns category with relations", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        ...sampleCategory,
        parent: null,
        children: [],
      } as any);

      const res = await request(app)
        .get(`/api/v1/admin/categories/${CATEGORY_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nameEn).toBe("Electronics");
    });

    it("returns 404 for missing category", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/v1/admin/categories/${MISSING_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/v1/admin/categories/:id", () => {
    it("updates category and returns 200", async () => {
      const updated = { ...sampleCategory, nameEn: "Updated Electronics" };
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(sampleCategory as any);
      vi.mocked(prisma.category.update).mockResolvedValueOnce(updated as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .patch(`/api/v1/admin/categories/${CATEGORY_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({ nameEn: "Updated Electronics" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nameEn).toBe("Updated Electronics");
    });
  });

  describe("DELETE /api/v1/admin/categories/:id", () => {
    it("returns 204 on successful delete", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        ...sampleCategory,
        children: [],
        _count: { products: 0 },
      } as any);
      vi.mocked(prisma.category.delete).mockResolvedValueOnce(sampleCategory as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .delete(`/api/v1/admin/categories/${CATEGORY_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(204);
    });

    it("returns 400 when category has children", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        ...sampleCategory,
        children: [{ id: "550e8400-e29b-41d4-a716-446655440010" }],
        _count: { products: 0 },
      } as any);

      const res = await request(app)
        .delete(`/api/v1/admin/categories/${CATEGORY_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Auth enforcement ──────────────────────────────────────────────────────

  describe("Auth enforcement", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/v1/admin/categories");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
    });
  });

  // ─── Public routes ─────────────────────────────────────────────────────────

  describe("GET /api/v1/categories (public)", () => {
    it("returns category tree", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { ...sampleCategory, parentId: null },
      ] as any);

      const res = await request(app).get("/api/v1/categories");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/categories/:slug (public)", () => {
    it("returns category by slug", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(sampleCategory as any);

      const res = await request(app).get("/api/v1/categories/electronics");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe("electronics");
    });

    it("returns 301 redirect for old slug", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.slugRedirect.findUnique).mockResolvedValueOnce({
        id: "550e8400-e29b-41d4-a716-446655440050",
        entityType: "category",
        oldSlug: "old-electronics",
        newSlug: "electronics",
        createdAt: new Date(),
      } as any);

      const res = await request(app).get("/api/v1/categories/old-electronics");

      expect(res.status).toBe(301);
      expect(res.headers.location).toBe("/api/v1/categories/electronics");
    });
  });
});
