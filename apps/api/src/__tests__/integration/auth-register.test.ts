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

// Mock Prisma before importing app
vi.mock("../../lib/prisma.js", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      userRole: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      loginEvent: {
        create: vi.fn(),
      },
    },
  };
});

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

describe("Registration Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/register/email", () => {
    const validBody = {
      email: "test@example.com",
      password: "Password1A",
      firstName: "Test",
      lastName: "User",
      preferredLanguage: "en",
      recaptchaToken: "test-token",
    };

    it("creates user with valid data", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        status: "pending_verification",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/register/email")
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe("user-1");
    });

    it("rejects duplicate email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "existing-user",
        email: "test@example.com",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/register/email")
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("rejects invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register/email")
        .send({ ...validBody, email: "not-an-email" });

      expect(res.status).toBe(400);
    });

    it("rejects weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register/email")
        .send({ ...validBody, password: "weak" });

      expect(res.status).toBe(400);
    });

    it("rejects missing required fields", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register/email")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/verify-email", () => {
    it("verifies email with valid token", async () => {
      const { getRedisClient } = await import("../../services/redis.js");
      const mockRedis = getRedisClient();
      // Override the store-based get to return the user ID for verification key
      vi.mocked(mockRedis.get).mockResolvedValueOnce("user-1");
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token: "550e8400-e29b-41d4-a716-446655440000" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects invalid token format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token: "not-a-uuid" });

      expect(res.status).toBe(400);
    });

    it("rejects expired/missing token", async () => {
      const { getRedisClient } = await import("../../services/redis.js");
      const mockRedis = getRedisClient();
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token: "550e8400-e29b-41d4-a716-446655440000" });

      expect(res.status).toBe(410);
    });
  });

  describe("POST /api/v1/auth/resend-verification", () => {
    it("returns success for any email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
        status: "pending_verification",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns success for non-existent email (security)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email: "nobody@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/register/phone", () => {
    const validBody = {
      phone: "+966512345678",
      firstName: "Test",
      lastName: "User",
      preferredLanguage: "en",
      recaptchaToken: "test-token",
    };

    it("creates phone registration with valid data", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/register/phone")
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
    });

    it("rejects duplicate phone", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "existing-user",
        phone: "+966512345678",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/register/phone")
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("rejects invalid phone format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register/phone")
        .send({ ...validBody, phone: "12345" });

      expect(res.status).toBe(400);
    });
  });
});
