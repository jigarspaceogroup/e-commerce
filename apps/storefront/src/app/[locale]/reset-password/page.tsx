"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="bg-surface-alt min-h-screen flex items-center justify-center py-12 px-4">
        <div className="bg-surface rounded-lg p-10 max-w-[480px] w-full text-center">
          <div className="bg-accent-red-bg text-accent-red border border-accent-red/20 rounded-lg p-4">
            <p className="text-body-sm">{t("passwordReset.invalidResetLink")}</p>
          </div>
          <div className="mt-4">
            <Link href="/login" className="text-body-sm text-primary underline">
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
      <div className="bg-surface-alt min-h-screen flex items-center justify-center py-12 px-4">
        <div className="bg-surface rounded-lg p-10 max-w-[480px] w-full text-center">
          <div className="bg-success/10 text-success border border-success/20 rounded-lg p-4">
            <svg className="mx-auto mb-3 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-body-sm">{t("passwordReset.passwordChanged")}</p>
          </div>
          <div className="mt-4">
            <Link href="/login" className="text-body-sm text-primary underline">
              {t("passwordReset.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-alt min-h-screen flex items-center justify-center py-12 px-4">
      <div className="bg-surface rounded-lg p-10 max-w-[480px] w-full">
        <h1 className="mb-8 text-center text-2xl font-bold text-primary">
          {t("passwordReset.resetPassword")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-accent-red-bg text-accent-red border border-accent-red/20 rounded-lg p-4 text-body-sm">{error}</div>
          )}

          <div>
            <label htmlFor="new-password" className="mb-1 block text-body-sm font-medium text-primary-muted">
              {t("passwordReset.newPassword")}
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-primary-subtle hover:text-primary"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="mb-1 block text-body-sm font-medium text-primary-muted">
              {t("passwordReset.confirmNewPassword")}
            </label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-primary-subtle hover:text-primary"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="full"
          >
            {loading ? common("loading") : t("passwordReset.resetPassword")}
          </Button>

          <div className="text-center">
            <Link href="/login" className="text-body-sm text-primary underline">
              {t("passwordReset.backToLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
