"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post("/auth/forgot-password", { email });
    } catch {
      // Always show success for security
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="bg-surface-alt min-h-screen flex items-center justify-center py-12 px-4">
      <div className="bg-surface rounded-lg p-10 max-w-[480px] w-full">
        <h1 className="mb-4 text-center text-2xl font-bold text-primary">
          {t("passwordReset.resetPassword")}
        </h1>

        {submitted ? (
          <div className="space-y-4">
            <div className="bg-success/10 text-success border border-success/20 rounded-lg p-4 text-center">
              <svg className="mx-auto mb-3 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-body-sm">
                {t("passwordReset.resetLinkSent", { email })}
              </p>
            </div>
            <div className="text-center">
              <Link href="/login" className="text-body-sm text-primary underline">
                {t("passwordReset.backToLogin")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-body-sm text-primary-muted">
              {t("passwordReset.enterEmail")}
            </p>

            <div>
              <label htmlFor="forgot-email" className="mb-1 block text-body-sm font-medium text-primary-muted">
                {t("login.emailLabel")}
              </label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="full"
            >
              {loading ? common("loading") : t("passwordReset.sendResetLink")}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-body-sm text-primary underline">
                {t("passwordReset.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
