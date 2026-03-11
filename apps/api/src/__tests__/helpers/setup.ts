import { vi } from "vitest";

// Mock Redis client
vi.mock("../../services/redis.js", () => {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  const mockRedis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, _ex?: string, _ttl?: number) => {
      store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    incr: vi.fn(async (key: string) => {
      const val = parseInt(store.get(key) ?? "0", 10) + 1;
      store.set(key, String(val));
      return val;
    }),
    expire: vi.fn(async () => 1),
    ttl: vi.fn(async () => 1800),
    sadd: vi.fn(async (key: string, ...members: string[]) => {
      if (!sets.has(key)) sets.set(key, new Set());
      members.forEach((m) => sets.get(key)!.add(m));
      return members.length;
    }),
    srem: vi.fn(async (key: string, ...members: string[]) => {
      if (!sets.has(key)) return 0;
      members.forEach((m) => sets.get(key)!.delete(m));
      return members.length;
    }),
    smembers: vi.fn(async (key: string) => [...(sets.get(key) ?? [])]),
    pipeline: vi.fn(() => ({
      del: vi.fn().mockReturnThis(),
      exec: vi.fn(async () => []),
    })),
    zadd: vi.fn(async () => 1),
    zremrangebyscore: vi.fn(async () => 0),
    zcard: vi.fn(async () => 1),
    multi: vi.fn(() => ({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn(async () => [
        [null, 0],
        [null, 1],
        [null, 1],
        [null, 1],
      ]),
    })),
  };

  return {
    getRedisClient: vi.fn(() => mockRedis),
    createRedisClient: vi.fn(() => mockRedis),
    cacheGet: vi.fn(async (key: string) => {
      const val = store.get(key);
      return val ? JSON.parse(val) : null;
    }),
    cacheSet: vi.fn(async (key: string, value: unknown) => {
      store.set(key, JSON.stringify(value));
    }),
    cacheDel: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    rateLimitCheck: vi.fn(async () => ({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 60000,
    })),
    __store: store,
    __sets: sets,
    __mockRedis: mockRedis,
  };
});
