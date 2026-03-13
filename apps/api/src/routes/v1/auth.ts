import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../middleware/validation.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  invalidateAllUserSessions,
  type TokenPayload,
} from "../../services/auth.js";
import { verifyRecaptchaV3 } from "../../services/recaptcha.js";
import { getRedisClient } from "../../services/redis.js";
import { generateOtp, verifyOtp } from "../../services/otp.js";
import { isAccountLocked, recordFailedAttempt, clearAttempts } from "../../services/lockout.js";
import { recordLoginEvent } from "../../services/login-event.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";
import { AppError, conflict, badRequest, unauthorized } from "../../middleware/error-handler.js";
import {
  emailRegisterSchema,
  phoneRegisterSchema,
  verifyEmailSchema,
  verifyOtpSchema,
  resendVerificationSchema,
  emailLoginSchema,
  phoneLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../schemas/auth.js";

const authRouter: IRouter = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth",
};

// Helper: fetch user roles/permissions and build token payload
async function buildTokenPayload(userId: string): Promise<TokenPayload> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const role = userRoles[0]?.role.name ?? "buyer";
  const permissions = userRoles.flatMap(
    (ur: { role: { permissions: Array<{ permission: { resource: string; action: string } }> } }) =>
      ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
  );

  return { sub: userId, role, permissions };
}

// Helper: issue tokens and set cookie
async function issueTokens(
  res: Response,
  userId: string,
  userAgent?: string,
): Promise<{ accessToken: string }> {
  const payload = await buildTokenPayload(userId);
  const jwtSecret = process.env.JWT_PRIVATE_KEY ?? "";
  const accessToken = generateAccessToken(payload, jwtSecret);
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(refreshToken, userId, userAgent);

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return { accessToken };
}

// ─── POST /auth/register/email ──────────────────────────────────────────────
authRouter.post(
  "/register/email",
  authRateLimiter,
  validate({ body: emailRegisterSchema }),
  async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, preferredLanguage, recaptchaToken } = req.body;

    const captcha = await verifyRecaptchaV3(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY ?? "");
    if (!captcha.success || captcha.challengeRequired) {
      throw badRequest("reCAPTCHA verification failed");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("Email already registered");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        preferredLanguage,
        status: "pending_verification",
      },
    });

    const token = crypto.randomUUID();
    const redis = getRedisClient();
    await redis.set(`email-verify:${token}`, user.id, "EX", 86400);

    console.log(`[EMAIL_VERIFY] User: ${email}, Token: ${token}`);

    sendCreated(res, {
      message: "Registration successful. Please verify your email.",
      userId: user.id,
    });
  },
);

// ─── POST /auth/verify-email ────────────────────────────────────────────────
authRouter.post(
  "/verify-email",
  validate({ body: verifyEmailSchema }),
  async (req: Request, res: Response) => {
    const { token } = req.body;
    const redis = getRedisClient();
    const userId = await redis.get(`email-verify:${token}`);

    if (!userId) {
      throw new AppError("Verification token expired or invalid", 410, "TOKEN_EXPIRED");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: "active" },
    });

    await redis.del(`email-verify:${token}`);
    sendSuccess(res, { message: "Email verified successfully" });
  },
);

// ─── POST /auth/resend-verification ─────────────────────────────────────────
authRouter.post(
  "/resend-verification",
  authRateLimiter,
  validate({ body: resendVerificationSchema }),
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const redis = getRedisClient();

    const rateLimitKey = `resend-verify:${email}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600);
    if (count > 3) {
      throw new AppError("Too many resend attempts", 429, "RATE_LIMIT_EXCEEDED");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === "pending_verification") {
      const token = crypto.randomUUID();
      await redis.set(`email-verify:${token}`, user.id, "EX", 86400);
      console.log(`[EMAIL_VERIFY_RESEND] User: ${email}, Token: ${token}`);
    }

    sendSuccess(res, { message: "If the email exists, a verification link has been sent." });
  },
);

// ─── POST /auth/register/phone ──────────────────────────────────────────────
authRouter.post(
  "/register/phone",
  authRateLimiter,
  validate({ body: phoneRegisterSchema }),
  async (req: Request, res: Response) => {
    const { phone, firstName, lastName, preferredLanguage, recaptchaToken } = req.body;

    const captcha = await verifyRecaptchaV3(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY ?? "");
    if (!captcha.success || captcha.challengeRequired) {
      throw badRequest("reCAPTCHA verification failed");
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw conflict("Phone number already registered");

    const otp = await generateOtp(phone);

    const redis = getRedisClient();
    await redis.set(
      `phone-register:${otp.sessionId}`,
      JSON.stringify({ phone, firstName, lastName: lastName ?? "", preferredLanguage }),
      "EX",
      600,
    );

    sendCreated(res, { message: "OTP sent to phone number", sessionId: otp.sessionId });
  },
);

// ─── POST /auth/verify-otp ─────────────────────────────────────────────────
authRouter.post(
  "/verify-otp",
  validate({ body: verifyOtpSchema }),
  async (req: Request, res: Response) => {
    const { phone, code, sessionId } = req.body;

    const valid = await verifyOtp(phone, code, sessionId);
    if (!valid) throw badRequest("Invalid or expired OTP");

    const redis = getRedisClient();
    const regData = await redis.get(`phone-register:${sessionId}`);

    if (regData) {
      const data = JSON.parse(regData) as {
        phone: string;
        firstName: string;
        lastName: string;
        preferredLanguage: string;
      };

      const placeholderEmail = `phone_${data.phone.replace("+", "")}@placeholder.local`;
      const user = await prisma.user.create({
        data: {
          email: placeholderEmail,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          preferredLanguage: data.preferredLanguage as "ar" | "en",
          status: "active",
          phoneVerifiedAt: new Date(),
        },
      });

      await redis.del(`phone-register:${sessionId}`);
      const { accessToken } = await issueTokens(res, user.id, req.headers["user-agent"]);
      sendCreated(res, { accessToken, user: { id: user.id, firstName: user.firstName } });
      return;
    }

    // Phone login flow
    const loginData = await redis.get(`phone-login:${sessionId}`);
    if (loginData) {
      const { userId } = JSON.parse(loginData) as { userId: string };
      await redis.del(`phone-login:${sessionId}`);
      await clearAttempts(userId);

      await recordLoginEvent({
        userId,
        phone,
        success: true,
        ip: req.ip ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
      });

      const { accessToken } = await issueTokens(res, userId, req.headers["user-agent"]);
      sendSuccess(res, { accessToken });
      return;
    }

    throw badRequest("No pending registration or login found for this session");
  },
);

// ─── POST /auth/login/email ─────────────────────────────────────────────────
authRouter.post(
  "/login/email",
  authRateLimiter,
  validate({ body: emailLoginSchema }),
  async (req: Request, res: Response) => {
    const { email, password, recaptchaToken } = req.body;

    const captcha = await verifyRecaptchaV3(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY ?? "");
    if (!captcha.success || captcha.challengeRequired) {
      throw badRequest("reCAPTCHA verification failed");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      await recordLoginEvent({
        email, success: false, ip: req.ip ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown", failureReason: "user_not_found",
      });
      throw unauthorized("Invalid email or password");
    }

    const lockStatus = await isAccountLocked(user.id);
    if (lockStatus.locked) {
      await recordLoginEvent({
        userId: user.id, email, success: false, ip: req.ip ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown", failureReason: "account_locked",
      });
      throw new AppError(
        `Account locked. Try again in ${Math.ceil((lockStatus.remainingSeconds ?? 0) / 60)} minutes`,
        423, "ACCOUNT_LOCKED",
      );
    }

    if (user.status === "pending_verification") {
      throw new AppError("Please verify your email first", 403, "EMAIL_NOT_VERIFIED");
    }
    if (user.status !== "active") {
      throw unauthorized("Account is not active");
    }

    const validPwd = await verifyPassword(password, user.passwordHash);
    if (!validPwd) {
      const lockResult = await recordFailedAttempt(user.id);
      await recordLoginEvent({
        userId: user.id, email, success: false, ip: req.ip ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown", failureReason: "wrong_password",
      });
      if (lockResult.locked) {
        throw new AppError("Account locked due to too many failed attempts", 423, "ACCOUNT_LOCKED");
      }
      throw unauthorized("Invalid email or password");
    }

    await clearAttempts(user.id);
    await recordLoginEvent({
      userId: user.id, email, success: true,
      ip: req.ip ?? "unknown", userAgent: req.headers["user-agent"] ?? "unknown",
    });

    const { accessToken } = await issueTokens(res, user.id, req.headers["user-agent"]);
    sendSuccess(res, { accessToken, user: { id: user.id, firstName: user.firstName } });
  },
);

// ─── POST /auth/login/phone ─────────────────────────────────────────────────
authRouter.post(
  "/login/phone",
  authRateLimiter,
  validate({ body: phoneLoginSchema }),
  async (req: Request, res: Response) => {
    const { phone, recaptchaToken } = req.body;

    const captcha = await verifyRecaptchaV3(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY ?? "");
    if (!captcha.success || captcha.challengeRequired) {
      throw badRequest("reCAPTCHA verification failed");
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw unauthorized("No account found with this phone number");

    const lockStatus = await isAccountLocked(user.id);
    if (lockStatus.locked) {
      throw new AppError("Account locked", 423, "ACCOUNT_LOCKED");
    }

    const otp = await generateOtp(phone);
    const redis = getRedisClient();
    await redis.set(`phone-login:${otp.sessionId}`, JSON.stringify({ userId: user.id }), "EX", 600);

    sendSuccess(res, { message: "OTP sent", sessionId: otp.sessionId });
  },
);

// ─── POST /auth/forgot-password ─────────────────────────────────────────────
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const redis = getRedisClient();

    const rateLimitKey = `password-reset:${email}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600);

    if (count <= 3) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const token = crypto.randomUUID();
        await redis.set(`pwd-reset:${token}`, user.id, "EX", 3600);
        console.log(`[PWD_RESET] User: ${email}, Token: ${token}`);
      }
    }

    sendSuccess(res, { message: "If the email exists, a reset link has been sent." });
  },
);

// ─── POST /auth/reset-password ──────────────────────────────────────────────
authRouter.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const redis = getRedisClient();

    const userId = await redis.get(`pwd-reset:${token}`);
    if (!userId) {
      throw new AppError("Reset token expired or invalid", 410, "TOKEN_EXPIRED");
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await invalidateAllUserSessions(userId);
    await clearAttempts(userId);
    await redis.del(`pwd-reset:${token}`);

    sendSuccess(res, { message: "Password reset successful. Please login." });
  },
);

// ─── POST /auth/refresh (migrated from flat routes) ─────────────────────────
authRouter.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) throw unauthorized("Refresh token required");

  const tokenData = await verifyRefreshToken(refreshToken);
  if (!tokenData) throw unauthorized("Invalid or expired refresh token");

  const userAgent = req.headers["user-agent"];
  const newRefreshToken = await rotateRefreshToken(refreshToken, tokenData.userId, userAgent);

  if (!newRefreshToken) {
    throw new AppError("Token reuse detected. All sessions invalidated.", 401, "AUTH_REFRESH_REUSE");
  }

  const payload = await buildTokenPayload(tokenData.userId);
  const jwtSecret = process.env.JWT_PRIVATE_KEY ?? "";
  const accessToken = generateAccessToken(payload, jwtSecret);

  res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, { accessToken });
});

// ─── POST /auth/logout (migrated from flat routes) ──────────────────────────
authRouter.post("/logout", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (refreshToken) {
    const tokenData = await verifyRefreshToken(refreshToken);
    if (tokenData) await revokeRefreshToken(refreshToken, tokenData.userId);
  }

  res.clearCookie("refreshToken", { path: "/api/v1/auth" });
  sendSuccess(res, { message: "Logged out successfully" });
});

export { authRouter };
