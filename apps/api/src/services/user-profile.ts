import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, invalidateAllUserSessions } from "./auth.js";
import { getRedisClient } from "./redis.js";
import { generateOtp } from "./otp.js";
import crypto from "crypto";

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      preferredLanguage: true,
      status: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      mfaEnabled: true,
    },
  });
}

export async function updateProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; preferredLanguage?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.preferredLanguage !== undefined
        ? { preferredLanguage: data.preferredLanguage as "ar" | "en" }
        : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferredLanguage: true,
    },
  });
}

export async function initiateEmailChange(userId: string, newEmail: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw new Error("User not found");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error("Invalid password");

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) throw new Error("Email already in use");

  const token = crypto.randomUUID();
  const redis = getRedisClient();
  await redis.set(
    `email-change:${token}`,
    JSON.stringify({ userId, newEmail, oldEmail: user.email }),
    "EX",
    86400,
  );

  console.log(`[EMAIL_CHANGE] User: ${user.email} → ${newEmail}, Token: ${token}`);
  return { message: "Verification sent to new email" };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw new Error("User not found");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Invalid current password");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await invalidateAllUserSessions(userId);
  return { message: "Password changed successfully" };
}

export async function initiatePhoneChange(userId: string, newPhone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw new Error("User not found");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error("Invalid password");

  const existing = await prisma.user.findUnique({ where: { phone: newPhone } });
  if (existing) throw new Error("Phone number already in use");

  const otp = await generateOtp(newPhone);
  const redis = getRedisClient();
  await redis.set(
    `phone-change:${otp.sessionId}`,
    JSON.stringify({ userId, newPhone }),
    "EX",
    600,
  );

  return { sessionId: otp.sessionId, message: "OTP sent to new phone" };
}
