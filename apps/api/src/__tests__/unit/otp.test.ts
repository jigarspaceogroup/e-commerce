import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateOtp, verifyOtp, canResendOtp } from "../../services/otp.js";
import { getRedisClient } from "../../services/redis.js";

describe("OTP Service", () => {
  let mockRedis: ReturnType<typeof getRedisClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = getRedisClient();
  });

  describe("generateOtp", () => {
    it("generates a 6-digit code and stores in Redis", async () => {
      const result = await generateOtp("+966512345678");
      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.sessionId).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining("otp:+966512345678"),
        expect.any(String),
        "EX",
        300,
      );
    });
  });

  describe("verifyOtp", () => {
    it("returns true for valid code", async () => {
      const stored = JSON.stringify({ code: "123456", phone: "+966512345678" });
      vi.mocked(mockRedis.get).mockResolvedValueOnce(stored);
      const result = await verifyOtp("+966512345678", "123456", "session-123");
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("returns false for invalid code", async () => {
      const stored = JSON.stringify({ code: "123456", phone: "+966512345678" });
      vi.mocked(mockRedis.get).mockResolvedValueOnce(stored);
      const result = await verifyOtp("+966512345678", "000000", "session-123");
      expect(result).toBe(false);
    });

    it("returns false for expired/missing OTP", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
      const result = await verifyOtp("+966512345678", "123456", "session-123");
      expect(result).toBe(false);
    });
  });

  describe("canResendOtp", () => {
    it("allows resend when under limit", async () => {
      // First get: cooldown check (null = no cooldown active)
      // Second get: resend count check ("1" = under limit)
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null).mockResolvedValueOnce("1");
      const result = await canResendOtp("+966512345678", "session-123");
      expect(result.allowed).toBe(true);
    });

    it("denies resend when at limit", async () => {
      // First get: cooldown check (null = no cooldown active)
      // Second get: resend count check ("3" = at limit)
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null).mockResolvedValueOnce("3");
      const result = await canResendOtp("+966512345678", "session-123");
      expect(result.allowed).toBe(false);
    });
  });
});
