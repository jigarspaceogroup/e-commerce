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
    JWT_PUBLIC_KEY: "test-public-key",
  },
}));

// Mock auth service
vi.mock("../../services/auth.js", () => ({
  verifyAccessToken: vi.fn().mockReturnValue({
    sub: "user-123",
    email: "user@test.com",
    permissions: [],
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

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    address: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";
const BASE_URL = "/api/v1/users/me/addresses";

const ADDRESS_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADDRESS_ID_2 = "550e8400-e29b-41d4-a716-446655440001";

const validAddress = {
  recipientName: "Nael Mattar",
  streetLine1: "123 King Fahd Road",
  city: "Riyadh",
  region: "Riyadh Region",
  postalCode: "12345",
  country: "SA",
  phone: "+966512345678",
};

const sampleAddress = {
  id: ADDRESS_ID,
  userId: "user-123",
  label: null,
  recipientName: "Nael Mattar",
  streetLine1: "123 King Fahd Road",
  streetLine2: null,
  city: "Riyadh",
  region: "Riyadh Region",
  postalCode: "12345",
  country: "SA",
  phone: "+966512345678",
  deliveryInstructions: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleAddress2 = {
  ...sampleAddress,
  id: ADDRESS_ID_2,
  recipientName: "Ahmed Ali",
  streetLine1: "456 Olaya Street",
  isDefault: false,
};

describe("Address API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Authentication ───────────────────────────────────────────────────────

  describe("Authentication", () => {
    it("GET returns 401 without token", async () => {
      const res = await request(app).get(BASE_URL);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("POST returns 401 without token", async () => {
      const res = await request(app).post(BASE_URL).send(validAddress);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("PUT returns 401 without token", async () => {
      const res = await request(app).put(`${BASE_URL}/${ADDRESS_ID}`).send({ city: "Jeddah" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("DELETE returns 401 without token", async () => {
      const res = await request(app).delete(`${BASE_URL}/${ADDRESS_ID}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("PATCH default returns 401 without token", async () => {
      const res = await request(app).patch(`${BASE_URL}/${ADDRESS_ID}/default`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /users/me/addresses ──────────────────────────────────────────────

  describe("GET /api/v1/users/me/addresses", () => {
    it("returns empty array initially", async () => {
      vi.mocked(prisma.address.findMany).mockResolvedValueOnce([]);

      const res = await request(app)
        .get(BASE_URL)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("returns created addresses sorted by default first", async () => {
      vi.mocked(prisma.address.findMany).mockResolvedValueOnce([
        sampleAddress,
        sampleAddress2,
      ] as any);

      const res = await request(app)
        .get(BASE_URL)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].isDefault).toBe(true);
    });
  });

  // ─── POST /users/me/addresses ─────────────────────────────────────────────

  describe("POST /api/v1/users/me/addresses", () => {
    it("creates address and returns 201", async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.address.create).mockResolvedValueOnce(sampleAddress as any);

      const res = await request(app)
        .post(BASE_URL)
        .set("Authorization", AUTH_HEADER)
        .send(validAddress);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ADDRESS_ID);
      expect(res.body.data.recipientName).toBe("Nael Mattar");
    });

    it("auto-sets first address as default", async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        ...sampleAddress,
        isDefault: true,
      } as any);

      const res = await request(app)
        .post(BASE_URL)
        .set("Authorization", AUTH_HEADER)
        .send(validAddress);

      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(true);

      expect(vi.mocked(prisma.address.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDefault: true,
          }),
        }),
      );
    });

    it("returns 400 for missing required fields", async () => {
      const res = await request(app)
        .post(BASE_URL)
        .set("Authorization", AUTH_HEADER)
        .send({ city: "Riyadh" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("validates Saudi postal code format (must be 5 digits)", async () => {
      const res = await request(app)
        .post(BASE_URL)
        .set("Authorization", AUTH_HEADER)
        .send({ ...validAddress, postalCode: "ABC12" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "postalCode",
            message: expect.stringContaining("5 digits"),
          }),
        ]),
      );
    });

    it("validates Saudi phone format", async () => {
      const res = await request(app)
        .post(BASE_URL)
        .set("Authorization", AUTH_HEADER)
        .send({ ...validAddress, phone: "123456789" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "phone",
            message: expect.stringContaining("Saudi phone"),
          }),
        ]),
      );
    });

    it("accepts phone with 0 prefix", async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        ...sampleAddress,
        phone: "0512345678",
        isDefault: false,
      } as any);

      const res = await request(app)
        .post(BASE_URL)
        .set("Authorization", AUTH_HEADER)
        .send({ ...validAddress, phone: "0512345678" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── PUT /users/me/addresses/:id ──────────────────────────────────────────

  describe("PUT /api/v1/users/me/addresses/:id", () => {
    it("updates address and returns updated data", async () => {
      const updatedAddress = { ...sampleAddress, city: "Jeddah" };
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.address.update).mockResolvedValueOnce(updatedAddress as any);

      const res = await request(app)
        .put(`${BASE_URL}/${ADDRESS_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({ city: "Jeddah" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.city).toBe("Jeddah");
    });

    it("returns 404 for non-existent address", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .put(`${BASE_URL}/${ADDRESS_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({ city: "Jeddah" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for invalid UUID param", async () => {
      const res = await request(app)
        .put(`${BASE_URL}/not-a-uuid`)
        .set("Authorization", AUTH_HEADER)
        .send({ city: "Jeddah" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /users/me/addresses/:id/default ────────────────────────────────

  describe("PATCH /api/v1/users/me/addresses/:id/default", () => {
    it("sets address as default", async () => {
      const defaultAddress = { ...sampleAddress, isDefault: true };
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, defaultAddress] as any);
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(defaultAddress as any);

      const res = await request(app)
        .patch(`${BASE_URL}/${ADDRESS_ID}/default`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDefault).toBe(true);
    });

    it("returns 404 for non-existent address", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`${BASE_URL}/${ADDRESS_ID}/default`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /users/me/addresses/:id ───────────────────────────────────────

  describe("DELETE /api/v1/users/me/addresses/:id", () => {
    it("removes address and returns 204", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce({
        ...sampleAddress,
        isDefault: false,
      } as any);
      vi.mocked(prisma.address.delete).mockResolvedValueOnce(sampleAddress as any);

      const res = await request(app)
        .delete(`${BASE_URL}/${ADDRESS_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent address", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .delete(`${BASE_URL}/${ADDRESS_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for invalid UUID param", async () => {
      const res = await request(app)
        .delete(`${BASE_URL}/not-a-uuid`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
