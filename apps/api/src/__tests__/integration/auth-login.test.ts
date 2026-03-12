import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

// JWT needs a secret to sign tokens
beforeAll(() => {
  process.env.JWT_PRIVATE_KEY = "test-jwt-secret-key-for-integration-tests";
});

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

describe("Login Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/login/email", () => {
    const validBody = {
      email: "test@example.com",
      password: "Password1A",
      recaptchaToken: "test-token",
    };

    it("logs in with valid credentials", async () => {
      const passwordHash = await bcrypt.hash("Password1A", 4);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
        status: "active",
        mfaEnabled: false,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/auth/login/email")
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.id).toBe("user-1");
    });

    it("rejects invalid password", async () => {
      const passwordHash = await bcrypt.hash("Password1A", 4);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
        passwordHash,
        firstName: "Test",
        status: "active",
        mfaEnabled: false,
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/login/email")
        .send({ ...validBody, password: "WrongPass1" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/login/email")
        .send({
          email: "nonexistent@test.com",
          password: "Password1A",
          recaptchaToken: "test-token",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects pending verification user", async () => {
      const passwordHash = await bcrypt.hash("Password1A", 4);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
        passwordHash,
        firstName: "Test",
        status: "pending_verification",
        mfaEnabled: false,
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/login/email")
        .send(validBody);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    });

    it("rejects validation errors", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/email")
        .send({ email: "not-email" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("sets refresh token cookie on successful login", async () => {
      const passwordHash = await bcrypt.hash("Password1A", 4);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        email: "test@example.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
        status: "active",
        mfaEnabled: false,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/auth/login/email")
        .send(validBody);

      expect(res.status).toBe(200);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
      expect(cookieStr).toContain("refreshToken");
    });
  });

  describe("POST /api/v1/auth/login/phone", () => {
    const validBody = {
      phone: "+966512345678",
      recaptchaToken: "test-token",
    };

    it("sends OTP for existing phone user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
        phone: "+966512345678",
        status: "active",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/login/phone")
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
    });

    it("rejects non-existent phone user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/login/phone")
        .send(validBody);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects invalid phone format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login/phone")
        .send({ phone: "12345", recaptchaToken: "test-token" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("clears refresh token cookie", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe("Logged out successfully");
    });
  });
});
