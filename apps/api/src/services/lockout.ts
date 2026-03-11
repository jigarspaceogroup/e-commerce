import { getRedisClient } from "./redis.js";

const MAX_ATTEMPTS = 5;
const LOCKOUT_TTL = 1800; // 30 minutes
const ATTEMPT_WINDOW_TTL = 1800; // 30 minutes
const ATTEMPT_PREFIX = "login-attempts:";
const LOCK_PREFIX = "account-locked:";

export interface LockoutStatus {
  locked: boolean;
  remainingSeconds?: number;
  attemptsRemaining?: number;
}

export async function isAccountLocked(userId: string): Promise<LockoutStatus> {
  const redis = getRedisClient();
  const lockKey = `${LOCK_PREFIX}${userId}`;
  const locked = await redis.get(lockKey);

  if (!locked) return { locked: false };

  const ttl = await redis.ttl(lockKey);
  return { locked: true, remainingSeconds: ttl };
}

export async function recordFailedAttempt(userId: string): Promise<LockoutStatus> {
  const redis = getRedisClient();
  const attemptKey = `${ATTEMPT_PREFIX}${userId}`;
  const count = await redis.incr(attemptKey);
  await redis.expire(attemptKey, ATTEMPT_WINDOW_TTL);

  if (count >= MAX_ATTEMPTS) {
    const lockKey = `${LOCK_PREFIX}${userId}`;
    await redis.set(lockKey, "1", "EX", LOCKOUT_TTL);
    console.log(`[LOCKOUT] Account locked: userId=${userId}, duration=${LOCKOUT_TTL}s`);
    return { locked: true, remainingSeconds: LOCKOUT_TTL };
  }

  return { locked: false, attemptsRemaining: MAX_ATTEMPTS - count };
}

export async function clearAttempts(userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`${ATTEMPT_PREFIX}${userId}`);
  await redis.del(`${LOCK_PREFIX}${userId}`);
}

export async function getAttemptsRemaining(userId: string): Promise<number> {
  const redis = getRedisClient();
  const count = await redis.get(`${ATTEMPT_PREFIX}${userId}`);
  return MAX_ATTEMPTS - (count ? parseInt(count, 10) : 0);
}
