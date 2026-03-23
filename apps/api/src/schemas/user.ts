import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  preferredLanguage: z.enum(["ar", "en"]).optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Current password required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

export const changePhoneSchema = z.object({
  newPhone: z.string().regex(/^\+9665\d{8}$/, "Invalid Saudi mobile number"),
  password: z.string().min(1, "Current password required"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangePhoneInput = z.infer<typeof changePhoneSchema>;
