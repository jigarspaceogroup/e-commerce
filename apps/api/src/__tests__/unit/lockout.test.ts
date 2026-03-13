import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordFailedAttempt,
  isAccountLocked,
  clearAttempts,
  getAttemptsRemaining,
} from "../../services/lockout.js";
import { getRedisClient } from "../../services/redis.js";

describe("Lockout Service", () => {
  let mockRedis: ReturnType<typeof getRedisClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = getRedisClient();
  });

  describe("isAccountLocked", () => {
    it("returns false when no lock key exists", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
      const result = await isAccountLocked("user-123");
      expect(result.locked).toBe(false);
    });

    it("returns true when lock key exists", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce("1");
      vi.mocked(mockRedis.ttl).mockResolvedValueOnce(1200);
      const result = await isAccountLocked("user-123");
      expect(result.locked).toBe(true);
      expect(result.remainingSeconds).toBe(1200);
    });
  });

  describe("recordFailedAttempt", () => {
    it("increments attempt counter", async () => {
      vi.mocked(mockRedis.incr).mockResolvedValueOnce(1);
      const result = await recordFailedAttempt("user-123");
      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
    });

    it("locks account after 5 failures", async () => {
      vi.mocked(mockRedis.incr).mockResolvedValueOnce(5);
      const result = await recordFailedAttempt("user-123");
      expect(result.locked).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining("account-locked:"),
        expect.any(String),
        "EX",
        1800,
      );
    });
  });

  describe("clearAttempts", () => {
    it("deletes both attempt and lock keys", async () => {
      await clearAttempts("user-123");
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAttemptsRemaining", () => {
    it("returns 5 when no attempts recorded", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
      const result = await getAttemptsRemaining("user-123");
      expect(result).toBe(5);
    });

    it("returns correct remaining after some failures", async () => {
      vi.mocked(mockRedis.get).mockResolvedValueOnce("3");
      const result = await getAttemptsRemaining("user-123");
      expect(result).toBe(2);
    });
  });
});
