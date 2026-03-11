import { prisma } from "../lib/prisma.js";

export interface LoginEventInput {
  userId?: string;
  email?: string;
  phone?: string;
  success: boolean;
  ip: string;
  userAgent: string;
  failureReason?: string;
}

export async function recordLoginEvent(input: LoginEventInput): Promise<void> {
  try {
    await prisma.loginEvent.create({
      data: {
        userId: input.userId,
        email: input.email,
        phone: input.phone,
        success: input.success,
        ip: input.ip,
        userAgent: input.userAgent ?? "unknown",
        failureReason: input.failureReason,
      },
    });
  } catch (err) {
    // Login event recording should never block the auth flow
    console.error("[LoginEvent] Failed to record:", err);
  }
}
