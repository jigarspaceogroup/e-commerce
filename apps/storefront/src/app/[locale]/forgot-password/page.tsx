"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";

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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
          {t("passwordReset.resetPassword")}
        </h1>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
              <svg className="mx-auto mb-3 h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-green-700">
                {t("passwordReset.resetLinkSent", { email })}
              </p>
            </div>
            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                {t("passwordReset.backToLogin")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              {t("passwordReset.enterEmail")}
            </p>

            <div>
              <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-gray-700">
                {t("login.emailLabel")}
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? common("loading") : t("passwordReset.sendResetLink")}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                {t("passwordReset.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
