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
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";

const sampleProfile = {
  id: "user-123",
  email: "user@test.com",
  phone: "+966512345678",
  firstName: "Test",
  lastName: "User",
  dateOfBirth: new Date("1990-05-15T00:00:00.000Z"),
  gender: "male",
  preferredLanguage: "ar",
  status: "active",
  emailVerifiedAt: new Date(),
  phoneVerifiedAt: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  mfaEnabled: false,
};

describe("Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /users/me ──────────────────────────────────────────────────────────

  describe("GET /api/v1/users/me", () => {
    it("returns profile with dateOfBirth and gender", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(sampleProfile as any);

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("user-123");
      expect(res.body.data.dateOfBirth).toBeDefined();
      expect(res.body.data.gender).toBe("male");
    });

    it("returns null dateOfBirth and gender when not set", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        ...sampleProfile,
        dateOfBirth: null,
        gender: null,
      } as any);

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateOfBirth).toBeNull();
      expect(res.body.data.gender).toBeNull();
    });

    it("returns 401 without authentication", async () => {
      const res = await request(app).get("/api/v1/users/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /users/me ────────────────────────────────────────────────────────

  describe("PATCH /api/v1/users/me", () => {
    it("updates dateOfBirth and gender", async () => {
      const updatedProfile = {
        id: "user-123",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        dateOfBirth: new Date("1995-08-20T00:00:00.000Z"),
        gender: "female",
        preferredLanguage: "ar",
      };

      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedProfile as any);

      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER)
        .send({
          dateOfBirth: "1995-08-20T00:00:00.000Z",
          gender: "female",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gender).toBe("female");
      expect(res.body.data.dateOfBirth).toBeDefined();

      expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: new Date("1995-08-20T00:00:00.000Z"),
            gender: "female",
          }),
        }),
      );
    });

    it("clears dateOfBirth and gender with null", async () => {
      const updatedProfile = {
        id: "user-123",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        dateOfBirth: null,
        gender: null,
        preferredLanguage: "ar",
      };

      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedProfile as any);

      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER)
        .send({
          dateOfBirth: null,
          gender: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateOfBirth).toBeNull();
      expect(res.body.data.gender).toBeNull();

      expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: null,
            gender: null,
          }),
        }),
      );
    });

    it("rejects invalid gender enum value", async () => {
      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER)
        .send({ gender: "invalid_value" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects invalid dateOfBirth format", async () => {
      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER)
        .send({ dateOfBirth: "not-a-date" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("accepts valid gender values: male, female, other", async () => {
      for (const gender of ["male", "female", "other"]) {
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          id: "user-123",
          email: "user@test.com",
          firstName: "Test",
          lastName: "User",
          dateOfBirth: null,
          gender,
          preferredLanguage: "ar",
        } as any);

        const res = await request(app)
          .patch("/api/v1/users/me")
          .set("Authorization", AUTH_HEADER)
          .send({ gender });

        expect(res.status).toBe(200);
        expect(res.body.data.gender).toBe(gender);
      }
    });

    it("updates dateOfBirth alongside other fields", async () => {
      const updatedProfile = {
        id: "user-123",
        email: "user@test.com",
        firstName: "Updated",
        lastName: "User",
        dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
        gender: "other",
        preferredLanguage: "en",
      };

      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedProfile as any);

      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", AUTH_HEADER)
        .send({
          firstName: "Updated",
          dateOfBirth: "2000-01-01T00:00:00.000Z",
          gender: "other",
          preferredLanguage: "en",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe("Updated");
      expect(res.body.data.gender).toBe("other");
    });
  });
});
