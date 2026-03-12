"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAdminAuth } from "@/lib/auth-context";
import { MfaInput } from "./mfa-input";

type Step = "credentials" | "mfa";

interface LoginResponse {
  mfaRequired?: boolean;
  sessionToken?: string;
  accessToken?: string;
  user?: any;
}

export function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAdminAuth();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<LoginResponse>("/admin/auth/login", { email, password });

      if (res.success) {
        if (res.data.mfaRequired && res.data.sessionToken) {
          setSessionToken(res.data.sessionToken);
          setStep("mfa");
        } else if (res.data.accessToken && res.data.user) {
          login(res.data.accessToken, res.data.user);
          router.push("/dashboard");
        }
      } else {
        setError((res as any).error?.message ?? "Invalid credentials");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) return;
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post<{ accessToken: string; user: any }>("/admin/auth/mfa/verify", {
        code: mfaCode,
        sessionToken,
      });

      if (res.success) {
        login(res.data.accessToken, res.data.user);
        router.push("/dashboard");
      } else {
        setError((res as any).error?.message ?? "Invalid MFA code");
        setMfaCode("");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (step === "mfa") {
    return (
      <form onSubmit={handleMfa} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <MfaInput value={mfaCode} onChange={setMfaCode} disabled={loading} />

        <button
          type="submit"
          disabled={loading || mfaCode.length !== 6}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={() => { setStep("credentials"); setMfaCode(""); setError(""); }}
          className="w-full text-sm text-gray-600 hover:text-gray-900"
        >
          Back to login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentials} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          id="admin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="admin-password"
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
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
