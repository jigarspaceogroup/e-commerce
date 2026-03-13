import crypto from "crypto";
import { getRedisClient } from "./redis.js";

const OTP_TTL = 300; // 5 minutes
const OTP_RESEND_MAX = 3;
const OTP_RESEND_COOLDOWN = 30; // seconds
const OTP_PREFIX = "otp:";
const OTP_RESEND_PREFIX = "otp-resend:";
const OTP_COOLDOWN_PREFIX = "otp-cooldown:";

export interface OtpResult {
  code: string;
  sessionId: string;
}

export async function generateOtp(phone: string): Promise<OtpResult> {
  const redis = getRedisClient();
  const code = String(crypto.randomInt(100000, 999999));
  const sessionId = crypto.randomUUID();

  const data = JSON.stringify({ code, phone });
  await redis.set(`${OTP_PREFIX}${phone}:${sessionId}`, data, "EX", OTP_TTL);

  // Set cooldown
  await redis.set(`${OTP_COOLDOWN_PREFIX}${phone}`, "1", "EX", OTP_RESEND_COOLDOWN);

  // Increment resend counter
  const resendKey = `${OTP_RESEND_PREFIX}${phone}:${sessionId}`;
  await redis.incr(resendKey);
  await redis.expire(resendKey, 3600);

  // Log OTP to console (real SMS deferred to Phase 2)
  console.log(`[OTP] Phone: ${phone}, Code: ${code}, Session: ${sessionId}`);

  return { code, sessionId };
}

export async function verifyOtp(
  phone: string,
  code: string,
  sessionId: string,
): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${OTP_PREFIX}${phone}:${sessionId}`;
  const data = await redis.get(key);

  if (!data) return false;

  const parsed = JSON.parse(data) as { code: string; phone: string };
  if (parsed.code !== code || parsed.phone !== phone) return false;

  // Consume the OTP
  await redis.del(key);
  return true;
}

export async function canResendOtp(
  phone: string,
  sessionId: string,
): Promise<{ allowed: boolean; cooldownRemaining?: number }> {
  const redis = getRedisClient();

  // Check cooldown
  const cooldownKey = `${OTP_COOLDOWN_PREFIX}${phone}`;
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    const ttl = await redis.ttl(cooldownKey);
    return { allowed: false, cooldownRemaining: ttl };
  }

  // Check resend count
  const resendKey = `${OTP_RESEND_PREFIX}${phone}:${sessionId}`;
  const count = await redis.get(resendKey);
  if (count && parseInt(count, 10) >= OTP_RESEND_MAX) {
    return { allowed: false };
  }

  return { allowed: true };
}
