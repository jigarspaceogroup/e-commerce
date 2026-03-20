"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "./password-strength";

export function EmailRegisterForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    preferredLanguage: "en",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }
    if (
      form.password.length < 8 ||
      !/[A-Z]/.test(form.password) ||
      !/[0-9]/.test(form.password)
    ) {
      setError(t("register.passwordRequirements"));
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{ userId: string; message: string }>(
        "/auth/register/email",
        {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          preferredLanguage: form.preferredLanguage,
          recaptchaToken: "dev-token", // TODO: integrate reCAPTCHA
        },
      );

      if (res.success) {
        setSuccess(t("register.verifyEmail", { email: form.email }));
      } else {
        setError(
          (res as unknown as { error?: { message?: string } }).error?.message ??
            "Registration failed",
        );
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-success/20 bg-success/10 p-6 text-center">
        <svg
          className="mx-auto mb-3 h-12 w-12 text-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-body-sm text-success">{success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-accent-red-bg p-3 text-body-sm text-accent-red">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="mb-1 block text-body-sm font-medium text-primary"
          >
            {t("register.firstName")}
          </label>
          <Input
            id="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="mb-1 block text-body-sm font-medium text-primary"
          >
            {t("register.lastName")}
          </label>
          <Input
            id="lastName"
            type="text"
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-body-sm font-medium text-primary"
        >
          {t("register.email")}
        </label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-body-sm font-medium text-primary"
        >
          {t("register.password")}
        </label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <PasswordStrength password={form.password} />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1 block text-body-sm font-medium text-primary"
        >
          {t("register.confirmPassword")}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          required
          value={form.confirmPassword}
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        size="full"
      >
        {loading ? common("loading") : t("register.createAccount")}
      </Button>
    </form>
  );
}
