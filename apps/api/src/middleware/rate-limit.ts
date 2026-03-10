import type { Request, Response, NextFunction } from "express";
import { rateLimitCheck } from "../services/redis.js";

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowSeconds, maxRequests, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const result = await rateLimitCheck(key, windowSeconds, maxRequests);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

      if (!result.allowed) {
        res.status(429).json({
          success: false,
          data: null,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        });
        return;
      }

      next();
    } catch {
      // Gracefully degrade if Redis is unavailable — allow the request through
      next();
    }
  };
}

/**
 * Auth endpoints: 5 requests per minute per IP.
 */
export const authRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 5,
  keyGenerator: (req) => `auth:${req.ip}`,
});

/**
 * Public endpoints: 100 requests per minute per IP.
 */
export const publicRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 100,
  keyGenerator: (req) => `public:${req.ip}`,
});

/**
 * Authenticated endpoints: 200 requests per minute per user ID.
 */
export const authenticatedRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 200,
  keyGenerator: (req) => `user:${req.user?.sub ?? req.ip}`,
});
