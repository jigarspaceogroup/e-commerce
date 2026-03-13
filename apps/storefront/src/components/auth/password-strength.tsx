"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "weak" };
  if (score <= 3) return { score, label: "medium" };
  return { score, label: "strong" };
}

const strengthColors: Record<string, string> = {
  weak: "bg-red-500",
  medium: "bg-yellow-500",
  strong: "bg-green-500",
};

const strengthLabels: Record<string, Record<string, string>> = {
  weak: { en: "Weak", ar: "ضعيفة" },
  medium: { en: "Medium", ar: "متوسطة" },
  strong: { en: "Strong", ar: "قوية" },
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { score, label } = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= score ? strengthColors[label] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`mt-1 text-xs ${label === "weak" ? "text-red-600" : label === "medium" ? "text-yellow-600" : "text-green-600"}`}
      >
        {strengthLabels[label]?.[locale] ?? label}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {t("register.passwordRequirements")}
      </p>
    </div>
  );
}
