import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  invalidateAllUserSessions,
} from "../../services/auth.js";
import { getRedisClient } from "../../services/redis.js";

describe("Auth Service", () => {
  let mockRedis: ReturnType<typeof getRedisClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = getRedisClient();
  });

  describe("password hashing", () => {
    it("hashes password to a bcrypt hash", async () => {
      const hash = await hashPassword("MyPassword1");
      expect(hash).not.toBe("MyPassword1");
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it("verifies correct password", async () => {
      const hash = await hashPassword("Test123!");
      expect(await verifyPassword("Test123!", hash)).toBe(true);
    });

    it("rejects incorrect password", async () => {
      const hash = await hashPassword("Test123!");
      expect(await verifyPassword("WrongPass", hash)).toBe(false);
    });
  });

  describe("JWT access tokens", () => {
    const secret = "test-secret-key-at-least-32-chars-long!!";
    const payload = {
      sub: "user-1",
      role: "buyer",
      permissions: ["products:read"],
    };

    it("generates and verifies access token", () => {
      const token = generateAccessToken(payload, secret);
      expect(typeof token).toBe("string");

      const decoded = verifyAccessToken(token, secret);
      expect(decoded.sub).toBe("user-1");
      expect(decoded.role).toBe("buyer");
      expect(decoded.permissions).toContain("products:read");
    });

    it("rejects tampered token", () => {
      const token = generateAccessToken(payload, secret);
      expect(() => verifyAccessToken(token + "x", secret)).toThrow();
    });

    it("rejects token with wrong secret", () => {
      const token = generateAccessToken(payload, secret);
      expect(() =>
        verifyAccessToken(token, "wrong-secret-key-also-32-chars!!"),
      ).toThrow();
    });
  });

  describe("refresh tokens", () => {
    it("generates a hex string", () => {
      const token = generateRefreshToken();
      expect(typeof token).toBe("string");
      expect(token).toMatch(/^[0-9a-f]+$/);
      expect(token.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it("stores refresh token in Redis", async () => {
      await storeRefreshToken("test-token", "user-1", "Chrome");
      expect(mockRedis.set).toHaveBeenCalledWith(
        "refresh_token:test-token",
        expect.stringContaining("user-1"),
        "EX",
        604800,
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        "user_sessions:user-1",
        "test-token",
      );
    });

    it("verifies valid refresh token", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(
        JSON.stringify({
          userId: "user-1",
          userAgent: "Chrome",
          createdAt: new Date().toISOString(),
        }),
      );
      const result = await verifyRefreshToken("valid-token");
      expect(result).toEqual({ userId: "user-1" });
    });

    it("returns null for missing refresh token", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
      const result = await verifyRefreshToken("expired-token");
      expect(result).toBeNull();
    });
  });

  describe("token rotation", () => {
    it("rotates token successfully", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(
        JSON.stringify({
          userId: "user-1",
          userAgent: "Chrome",
          createdAt: new Date().toISOString(),
        }),
      );
      const newToken = await rotateRefreshToken(
        "old-token",
        "user-1",
        "Chrome",
      );
      expect(newToken).toBeTruthy();
      expect(typeof newToken).toBe("string");
      expect(mockRedis.del).toHaveBeenCalledWith("refresh_token:old-token");
    });

    it("returns null and invalidates sessions on token reuse", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
      vi.mocked(mockRedis.smembers).mockResolvedValueOnce([]);
      const result = await rotateRefreshToken("consumed-token", "user-1");
      expect(result).toBeNull();
    });
  });

  describe("revoke and invalidate", () => {
    it("revokes single refresh token", async () => {
      await revokeRefreshToken("token-1", "user-1");
      expect(mockRedis.del).toHaveBeenCalledWith("refresh_token:token-1");
      expect(mockRedis.srem).toHaveBeenCalledWith(
        "user_sessions:user-1",
        "token-1",
      );
    });

    it("invalidates all user sessions", async () => {
      vi.mocked(mockRedis.smembers).mockResolvedValueOnce([
        "token-1",
        "token-2",
      ]);
      await invalidateAllUserSessions("user-1");
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });
});
