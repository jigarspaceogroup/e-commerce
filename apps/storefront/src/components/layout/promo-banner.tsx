"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const BANNER_DISMISSED_KEY = "promo-banner-dismissed";

export function PromoBanner() {
  const t = useTranslations("common");
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (stored !== "true") {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-primary py-2 text-center">
      <p className="text-body-sm font-medium text-on-primary">
        {t("promoBanner", { defaultValue: "Sign up and get 20% off your first order." })}{" "}
        <button onClick={handleDismiss} className="underline font-medium">
          {t("promoBannerCta", { defaultValue: "Sign Up Now" })}
        </button>
      </p>
      <button
        onClick={handleDismiss}
        className="absolute end-4 top-1/2 -translate-y-1/2 text-on-primary hover:opacity-70"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
