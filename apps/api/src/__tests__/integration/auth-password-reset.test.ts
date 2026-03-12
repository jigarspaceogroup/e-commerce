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

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userRole: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    loginEvent: {
      create: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

describe("Password Reset Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("returns success for existing user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns success for non-existent email (security)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nonexistent@test.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("resets password with valid token", async () => {
      const { getRedisClient } = await import("../../services/redis.js");
      const mockRedis = getRedisClient();
      vi.mocked(mockRedis.get).mockResolvedValueOnce("user-1");
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "550e8400-e29b-41d4-a716-446655440000",
          password: "NewPassword1A",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects expired/invalid reset token", async () => {
      const { getRedisClient } = await import("../../services/redis.js");
      const mockRedis = getRedisClient();
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "550e8400-e29b-41d4-a716-446655440000",
          password: "NewPassword1A",
        });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
    });

    it("rejects weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "550e8400-e29b-41d4-a716-446655440000",
          password: "weak",
        });

      expect(res.status).toBe(400);
    });

    it("rejects missing token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ password: "NewPassword1A" });

      expect(res.status).toBe(400);
    });
  });
});
