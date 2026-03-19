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
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";

const CUSTOMER_ID = "550e8400-e29b-41d4-a716-446655440001";
const MISSING_ID = "550e8400-e29b-41d4-a716-446655440099";

const sampleCustomer = {
  id: CUSTOMER_ID,
  email: "customer@test.com",
  phone: "+966512345678",
  firstName: "Test",
  lastName: "Customer",
  dateOfBirth: null,
  gender: null,
  preferredLanguage: "en",
  status: "active",
  emailVerifiedAt: new Date(),
  phoneVerifiedAt: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  deletedAt: null,
  addresses: [],
  _count: { orders: 3 },
  orders: [
    {
      id: "550e8400-e29b-41d4-a716-446655440010",
      orderNumber: "ORD-001",
      status: "completed",
      grandTotal: 299.99,
      createdAt: new Date(),
    },
  ],
};

describe("Customer API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── List ──────────────────────────────────────────────────────────────────

  describe("GET /api/v1/admin/customers", () => {
    it("returns paginated customer list", async () => {
      const listItem = {
        id: sampleCustomer.id,
        email: sampleCustomer.email,
        phone: sampleCustomer.phone,
        firstName: sampleCustomer.firstName,
        lastName: sampleCustomer.lastName,
        createdAt: sampleCustomer.createdAt,
        _count: { orders: 3 },
      };
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([listItem] as any);

      const res = await request(app)
        .get("/api/v1/admin/customers")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.data[0].email).toBe("customer@test.com");
    });
  });

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  describe("GET /api/v1/admin/customers/:id", () => {
    it("returns customer detail with orders", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(sampleCustomer as any);

      const res = await request(app)
        .get(`/api/v1/admin/customers/${CUSTOMER_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("customer@test.com");
      expect(res.body.data.orders).toBeDefined();
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    it("returns 404 for missing customer", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/v1/admin/customers/${MISSING_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Auth enforcement ──────────────────────────────────────────────────────

  describe("Auth enforcement", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/v1/admin/customers");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
    });
  });
});
