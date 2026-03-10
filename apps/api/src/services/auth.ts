import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getRedisClient } from "./redis.js";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_PREFIX = "refresh_token:";
const USER_SESSIONS_PREFIX = "user_sessions:";

export interface TokenPayload {
  sub: string;
  role: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Access token (RS256 or HS256 depending on key availability)
export function generateAccessToken(
  payload: TokenPayload,
  privateKey: string,
): string {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    },
    privateKey,
    {
      algorithm: "HS256",
      expiresIn: ACCESS_TOKEN_EXPIRY,
    },
  );
}

export function verifyAccessToken(token: string, publicKey: string): TokenPayload {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ["HS256"],
  }) as jwt.JwtPayload;

  return {
    sub: decoded.sub as string,
    role: decoded.role as string,
    permissions: decoded.permissions as string[],
  };
}

// Refresh tokens (opaque, stored in Redis)
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export async function storeRefreshToken(
  token: string,
  userId: string,
  userAgent?: string,
): Promise<void> {
  const redis = getRedisClient();
  const tokenData = JSON.stringify({
    userId,
    userAgent: userAgent ?? "unknown",
    createdAt: new Date().toISOString(),
  });

  // Store token with TTL
  await redis.set(
    `${REFRESH_TOKEN_PREFIX}${token}`,
    tokenData,
    "EX",
    REFRESH_TOKEN_EXPIRY_SECONDS,
  );

  // Track token in user's session set
  await redis.sadd(`${USER_SESSIONS_PREFIX}${userId}`, token);
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string } | null> {
  const redis = getRedisClient();
  const data = await redis.get(`${REFRESH_TOKEN_PREFIX}${token}`);

  if (!data) return null;

  const parsed = JSON.parse(data) as { userId: string };
  return { userId: parsed.userId };
}

export async function rotateRefreshToken(
  oldToken: string,
  userId: string,
  userAgent?: string,
): Promise<string | null> {
  const redis = getRedisClient();

  // Verify and consume old token atomically
  const data = await redis.get(`${REFRESH_TOKEN_PREFIX}${oldToken}`);
  if (!data) {
    // Reuse detection: old token already consumed — invalidate all sessions
    await invalidateAllUserSessions(userId);
    return null;
  }

  // Delete old token
  await redis.del(`${REFRESH_TOKEN_PREFIX}${oldToken}`);
  await redis.srem(`${USER_SESSIONS_PREFIX}${userId}`, oldToken);

  // Issue new token
  const newToken = generateRefreshToken();
  await storeRefreshToken(newToken, userId, userAgent);

  return newToken;
}

export async function revokeRefreshToken(token: string, userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`${REFRESH_TOKEN_PREFIX}${token}`);
  await redis.srem(`${USER_SESSIONS_PREFIX}${userId}`, token);
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const redis = getRedisClient();
  const tokens = await redis.smembers(`${USER_SESSIONS_PREFIX}${userId}`);

  if (tokens.length > 0) {
    const pipeline = redis.pipeline();
    for (const token of tokens) {
      pipeline.del(`${REFRESH_TOKEN_PREFIX}${token}`);
    }
    pipeline.del(`${USER_SESSIONS_PREFIX}${userId}`);
    await pipeline.exec();
  }
}
