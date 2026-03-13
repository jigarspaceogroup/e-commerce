import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const recaptchaTokenSchema =
  process.env.NODE_ENV === "production"
    ? z.string().min(1, "reCAPTCHA token required")
    : z.string().optional().default("");

export const emailRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  preferredLanguage: z.enum(["ar", "en"]).default("ar"),
  recaptchaToken: recaptchaTokenSchema,
});

export const phoneRegisterSchema = z.object({
  phone: z.string().regex(/^\+9665\d{8}$/, "Invalid Saudi mobile number (must be +9665XXXXXXXX)"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().max(50).optional(),
  preferredLanguage: z.enum(["ar", "en"]).default("ar"),
  recaptchaToken: recaptchaTokenSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().uuid("Invalid verification token"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+9665\d{8}$/, "Invalid Saudi mobile number"),
  code: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/),
  sessionId: z.string().uuid("Invalid session ID"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const emailLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  recaptchaToken: recaptchaTokenSchema,
});

export const phoneLoginSchema = z.object({
  phone: z.string().regex(/^\+9665\d{8}$/, "Invalid Saudi mobile number"),
  recaptchaToken: recaptchaTokenSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid("Invalid reset token"),
  password: passwordSchema,
});

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const mfaVerifySchema = z.object({
  code: z.string().length(6, "MFA code must be 6 digits").regex(/^\d{6}$/),
  sessionToken: z.string().min(1, "Session token required"),
});

export type EmailRegisterInput = z.infer<typeof emailRegisterSchema>;
export type PhoneRegisterInput = z.infer<typeof phoneRegisterSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
