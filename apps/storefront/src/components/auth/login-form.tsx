"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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
      <div className="flex rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => { setMode("email"); setError(""); }}
          className={`flex-1 rounded-s-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "email" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("register.emailTab")}
        </button>
        <button
          type="button"
          onClick={() => { setMode("phone"); setPhoneStep("phone"); setError(""); }}
          className={`flex-1 rounded-e-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "phone" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("register.phoneTab")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Email login */}
      {mode === "email" && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">
              {t("login.emailLabel")}
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                {t("login.passwordLabel")}
              </label>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                {t("login.forgotPassword")}
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? common("loading") : t("login.loginButton")}
          </button>
        </form>
      )}

      {/* Phone login */}
      {mode === "phone" && phoneStep === "phone" && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-phone" className="mb-1 block text-sm font-medium text-gray-700">
              {t("register.phone")}
            </label>
            <input
              id="login-phone"
              type="tel"
              required
              dir="ltr"
              placeholder="+9665XXXXXXXX"
              pattern="^\+9665\d{8}$"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? common("loading") : t("login.loginButton")}
          </button>
        </form>
      )}

      {/* Phone OTP step */}
      {mode === "phone" && phoneStep === "otp" && (
        <form onSubmit={handleOtpVerify} className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">{t("otp.enterOtp")}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {t("otp.otpSent", { destination: phone })}
            </p>
          </div>

          <OtpInput value={otpCode} onChange={setOtpCode} disabled={loading} />

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? common("loading") : common("confirm")}
          </button>

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                {t("otp.resendIn", { seconds: String(resendTimer) })}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
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
