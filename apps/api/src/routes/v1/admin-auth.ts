import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { validate } from "../../middleware/validation.js";
import { authenticate } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  type TokenPayload,
} from "../../services/auth.js";
import { generateMfaSecret, verifyMfaCode, encryptSecret } from "../../services/mfa.js";
import { isAccountLocked, recordFailedAttempt, clearAttempts } from "../../services/lockout.js";
import { recordLoginEvent } from "../../services/login-event.js";
import { getRedisClient } from "../../services/redis.js";
import { sendSuccess } from "../../utils/response.js";
import { AppError, unauthorized, badRequest } from "../../middleware/error-handler.js";
import { adminLoginSchema, mfaVerifySchema } from "../../schemas/auth.js";
import { prisma } from "../../lib/prisma.js";

const adminAuthRouter: IRouter = Router();

const ADMIN_ROLES = ["Super Admin", "Product Manager", "Order Manager", "Content Manager", "Support Agent"];

// Helper: build token payload from actual DB roles/permissions
async function buildAdminTokenPayload(userId: string): Promise<TokenPayload> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  const role = userRoles[0]?.role.name ?? "admin";
  const permissions = userRoles.flatMap((ur) =>
    ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
  );
  return { sub: userId, role, permissions };
}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth",
};

// ─── POST /admin/auth/login ─────────────────────────────────────────────────
adminAuthRouter.post(
  "/login",
  authRateLimiter,
  validate({ body: adminLoginSchema }),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash) throw unauthorized("Invalid credentials");

    // Verify admin role
    const isAdmin = user.userRoles.some((ur) => ADMIN_ROLES.includes(ur.role.name));
    if (!isAdmin) throw unauthorized("Invalid credentials");

    // Check lockout
    const lockStatus = await isAccountLocked(user.id);
    if (lockStatus.locked) {
      throw new AppError("Account locked", 423, "ACCOUNT_LOCKED");
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordFailedAttempt(user.id);
      await recordLoginEvent({
        userId: user.id,
        email,
        success: false,
        ip: req.ip ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
        failureReason: "wrong_password",
      });
      throw unauthorized("Invalid credentials");
    }

    // If MFA enabled, return temp session token
    if (user.mfaEnabled && user.mfaSecret) {
      const sessionToken = crypto.randomUUID();
      const redis = getRedisClient();
      await redis.set(`admin-mfa:${sessionToken}`, user.id, "EX", 300);
      sendSuccess(res, { mfaRequired: true, sessionToken });
      return;
    }

    // No MFA — issue tokens directly
    await clearAttempts(user.id);
    await recordLoginEvent({
      userId: user.id,
      email,
      success: true,
      ip: req.ip ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "unknown",
    });

    const payload = await buildAdminTokenPayload(user.id);
    const accessToken = generateAccessToken(payload, process.env.JWT_PRIVATE_KEY ?? "");
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(refreshToken, user.id, req.headers["user-agent"]);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, { accessToken });
  },
);

// ─── POST /admin/auth/mfa/setup ─────────────────────────────────────────────
adminAuthRouter.post(
  "/mfa/setup",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized("User not found");

    if (user.mfaEnabled) throw badRequest("MFA already enabled");

    const { secret, uri } = await generateMfaSecret(user.email);

    const redis = getRedisClient();
    await redis.set(`mfa-setup:${userId}`, secret, "EX", 600);

    sendSuccess(res, { uri, secret });
  },
);

// ─── POST /admin/auth/mfa/verify (login MFA verification) ──────────────────
adminAuthRouter.post(
  "/mfa/verify",
  validate({ body: mfaVerifySchema }),
  async (req: Request, res: Response) => {
    const { code, sessionToken } = req.body;
    const redis = getRedisClient();

    const userId = await redis.get(`admin-mfa:${sessionToken}`);
    if (!userId) throw badRequest("Invalid or expired session token");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw unauthorized("Invalid session");

    // Check MFA lockout (3 failures = 30 min lock)
    const lockStatus = await isAccountLocked(`mfa:${userId}`);
    if (lockStatus.locked) {
      throw new AppError("MFA locked due to too many attempts", 423, "MFA_LOCKED");
    }

    const encKey = process.env.MFA_ENCRYPTION_KEY ?? "";
    const valid = verifyMfaCode(user.mfaSecret, code, encKey || undefined);
    if (!valid) {
      await recordFailedAttempt(`mfa:${userId}`);
      throw unauthorized("Invalid MFA code");
    }

    await clearAttempts(`mfa:${userId}`);
    await clearAttempts(userId);
    await redis.del(`admin-mfa:${sessionToken}`);

    await recordLoginEvent({
      userId,
      email: user.email,
      success: true,
      ip: req.ip ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "unknown",
    });

    const payload = await buildAdminTokenPayload(user.id);
    const accessToken = generateAccessToken(payload, process.env.JWT_PRIVATE_KEY ?? "");
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(refreshToken, user.id, req.headers["user-agent"]);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, { accessToken });
  },
);

// ─── POST /admin/auth/mfa/confirm-setup (authenticated, confirms MFA setup) ─
adminAuthRouter.post(
  "/mfa/confirm-setup",
  authenticate,
  async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code || typeof code !== "string" || code.length !== 6) {
      throw badRequest("6-digit code required");
    }

    const redis = getRedisClient();
    const setupSecret = await redis.get(`mfa-setup:${req.user!.sub}`);
    if (!setupSecret) throw badRequest("No MFA setup in progress");

    const valid = verifyMfaCode(setupSecret, code);
    if (!valid) throw badRequest("Invalid code. Please try again.");

    // Encrypt secret before storing to database
    const encKey = process.env.MFA_ENCRYPTION_KEY ?? "";
    const encryptedSecret = encKey ? encryptSecret(setupSecret, encKey) : setupSecret;

    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { mfaSecret: encryptedSecret, mfaEnabled: true },
    });

    await redis.del(`mfa-setup:${req.user!.sub}`);
    sendSuccess(res, { message: "MFA enabled successfully" });
  },
);

export { adminAuthRouter };
