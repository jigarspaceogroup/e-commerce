"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { PasswordStrength } from "@/components/auth/password-strength";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">{t("passwordReset.invalidResetLink")}</p>
          </div>
          <div className="mt-4">
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {t("passwordReset.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t("register.passwordRequirements"));
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/reset-password", { token, password });
      if (res.success) {
        setSuccess(true);
      } else {
        const err = res as any;
        if (err.error?.code === "TOKEN_EXPIRED") {
          setError(t("passwordReset.invalidResetLink"));
        } else {
          setError(err.error?.message ?? "Failed to reset password");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <svg className="mx-auto mb-3 h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-700">{t("passwordReset.passwordChanged")}</p>
          </div>
          <div className="mt-4">
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {t("passwordReset.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
          {t("passwordReset.resetPassword")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
              {t("passwordReset.newPassword")}
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-gray-700">
              {t("passwordReset.confirmNewPassword")}
            </label>
            <input
              id="confirm-new-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? common("loading") : t("passwordReset.resetPassword")}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {t("passwordReset.backToLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
