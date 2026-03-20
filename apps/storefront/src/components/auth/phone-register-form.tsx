"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OtpInput } from "./otp-input";

type Step = "phone" | "otp";

export function PhoneRegisterForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    preferredLanguage: "en",
  });
  const [sessionId, setSessionId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<{ sessionId: string }>(
        "/auth/register/phone",
        {
          phone: form.phone,
          firstName: form.firstName,
          lastName: form.lastName,
          preferredLanguage: form.preferredLanguage,
          recaptchaToken: "dev-token", // TODO: integrate reCAPTCHA
        },
      );

      if (res.success) {
        setSessionId(res.data.sessionId);
        setStep("otp");
        setResendTimer(30);
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

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<{
        accessToken: string;
        user: { id: string; firstName: string; email?: string; phone?: string };
      }>("/auth/verify-otp", {
        phone: form.phone,
        code: otpCode,
        sessionId,
      });

      if (res.success) {
        login(res.data.accessToken, res.data.user);
        router.push("/");
      } else {
        setError(
          (res as unknown as { error?: { message?: string } }).error?.message ??
            t("otp.invalidOtp"),
        );
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    try {
      await apiClient.post("/auth/register/phone", {
        phone: form.phone,
        firstName: form.firstName,
        lastName: form.lastName,
        preferredLanguage: form.preferredLanguage,
        recaptchaToken: "dev-token",
      });
      setResendTimer(30);
      setOtpCode("");
    } catch {
      // ignore
    }
  }, [form, resendTimer]);

  if (step === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-accent-red-bg p-3 text-body-sm text-accent-red">
            {error}
          </div>
        )}

        <div className="text-center">
          <h3 className="font-heading text-heading-md font-bold text-primary">
            {t("otp.enterOtp")}
          </h3>
          <p className="mt-1 text-body-sm text-primary-muted">
            {t("otp.otpSent", { destination: form.phone })}
          </p>
        </div>

        <OtpInput value={otpCode} onChange={setOtpCode} disabled={loading} />

        <Button
          type="submit"
          disabled={loading || otpCode.length !== 6}
          size="full"
        >
          {loading ? common("loading") : common("confirm")}
        </Button>

        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-body-sm text-primary-muted">
              {t("otp.resendIn", { seconds: String(resendTimer) })}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-body-sm text-primary underline hover:opacity-80"
            >
              {t("otp.resendOtp")}
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handlePhoneSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-accent-red-bg p-3 text-body-sm text-accent-red">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="phone-firstName"
            className="mb-1 block text-body-sm font-medium text-primary"
          >
            {t("register.firstName")}
          </label>
          <Input
            id="phone-firstName"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor="phone-lastName"
            className="mb-1 block text-body-sm font-medium text-primary"
          >
            {t("register.lastName")}
          </label>
          <Input
            id="phone-lastName"
            type="text"
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-body-sm font-medium text-primary"
        >
          {t("register.phone")}
        </label>
        <Input
          id="phone"
          type="tel"
          required
          dir="ltr"
          placeholder="+9665XXXXXXXX"
          pattern="^\+9665\d{8}$"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
