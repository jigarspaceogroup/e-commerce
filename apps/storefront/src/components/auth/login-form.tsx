"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OtpInput } from "./otp-input";

type Mode = "email" | "phone";
type PhoneStep = "phone" | "otp";

export function LoginForm() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("email");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone form
  const [phone, setPhone] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<{ accessToken: string; user: any }>("/auth/login/email", {
        email,
        password,
        recaptchaToken: "dev-token", // TODO: reCAPTCHA
      });

      if (res.success) {
        login(res.data.accessToken, res.data.user);
        router.push("/");
      } else {
        const err = res as any;
        if (err.error?.code === "ACCOUNT_LOCKED") {
          setError(t("login.accountLocked"));
        } else {
          setError(err.error?.message ?? t("login.invalidCredentials"));
        }
      }
    } catch {
      setError(t("login.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<{ sessionId: string }>("/auth/login/phone", {
        phone,
        recaptchaToken: "dev-token",
      });

      if (res.success) {
        setSessionId(res.data.sessionId);
        setPhoneStep("otp");
        setResendTimer(30);
      } else {
        setError((res as any).error?.message ?? "Failed to send OTP");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<{ accessToken: string; user: any }>("/auth/verify-otp", {
        phone,
        code: otpCode,
        sessionId,
      });

      if (res.success) {
        login(res.data.accessToken, res.data.user);
        router.push("/");
      } else {
        setError((res as any).error?.message ?? t("otp.invalidOtp"));
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
      await apiClient.post("/auth/login/phone", {
        phone,
        recaptchaToken: "dev-token",
      });
      setResendTimer(30);
      setOtpCode("");
    } catch {
      // ignore
    }
  }, [phone, resendTimer]);

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setMode("email"); setError(""); }}
          className={`flex-1 rounded-pill px-4 py-2.5 text-body-sm font-medium transition-colors ${
            mode === "email" ? "bg-primary text-on-primary" : "bg-transparent text-primary-muted hover:bg-black/5"
          }`}
        >
          {t("register.emailTab")}
        </button>
        <button
          type="button"
          onClick={() => { setMode("phone"); setPhoneStep("phone"); setError(""); }}
          className={`flex-1 rounded-pill px-4 py-2.5 text-body-sm font-medium transition-colors ${
            mode === "phone" ? "bg-primary text-on-primary" : "bg-transparent text-primary-muted hover:bg-black/5"
          }`}
        >
          {t("register.phoneTab")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-accent-red-bg p-3 text-body-sm text-accent-red">{error}</div>
      )}

      {/* Email login */}
      {mode === "email" && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-body-sm font-medium text-primary">
              {t("login.emailLabel")}
            </label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-body-sm font-medium text-primary">
                {t("login.passwordLabel")}
              </label>
              <a href="/forgot-password" className="text-body-sm text-primary underline hover:opacity-80">
                {t("login.forgotPassword")}
              </a>
            </div>
            <Input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="full"
          >
            {loading ? common("loading") : t("login.loginButton")}
          </Button>
        </form>
      )}

      {/* Phone login */}
      {mode === "phone" && phoneStep === "phone" && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-phone" className="mb-1 block text-body-sm font-medium text-primary">
              {t("register.phone")}
            </label>
            <Input
              id="login-phone"
              type="tel"
              required
              dir="ltr"
              placeholder="+9665XXXXXXXX"
              pattern="^\+9665\d{8}$"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="full"
          >
            {loading ? common("loading") : t("login.loginButton")}
          </Button>
        </form>
      )}

      {/* Phone OTP step */}
      {mode === "phone" && phoneStep === "otp" && (
        <form onSubmit={handleOtpVerify} className="space-y-4">
          <div className="text-center">
            <h3 className="font-heading text-heading-md font-bold text-primary">{t("otp.enterOtp")}</h3>
            <p className="mt-1 text-body-sm text-primary-muted">
              {t("otp.otpSent", { destination: phone })}
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
      )}
    </div>
  );
}
