import Redis from "ioredis";

let redisClient: Redis | null = null;

export function createRedisClient(url: string): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  });

  client.on("connect", () => {
    console.info("Redis: connected");
  });

  client.on("error", (err) => {
    console.error("Redis: connection error", err.message);
  });

  client.on("close", () => {
    console.info("Redis: connection closed");
  });

  redisClient = client;
  return client;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call createRedisClient first.");
  }
  return redisClient;
}

// Health check
export async function redisHealthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const data = await client.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedisClient();
  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}

// Rate limiting (sliding window)
export async function rateLimitCheck(
  key: string,
  windowSeconds: number,
  maxRequests: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedisClient();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const multi = client.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zadd(key, now, `${now}`);
  multi.zcard(key);
  multi.expire(key, windowSeconds);

  const results = await multi.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetAt = now + windowSeconds * 1000;

  return { allowed, remaining, resetAt };
}
