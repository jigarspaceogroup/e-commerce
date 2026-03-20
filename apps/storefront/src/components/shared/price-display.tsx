"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";

interface PriceDisplayProps {
  basePrice: number;
  compareAtPrice?: number | null;
  locale: string;
}

export function PriceDisplay({ basePrice, compareAtPrice, locale }: PriceDisplayProps) {
  const t = useTranslations("product");

  const hasDiscount = compareAtPrice && compareAtPrice > basePrice;
  const discount = hasDiscount
    ? Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
    : 0;

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="price-display">
      <span className="text-lg font-bold text-primary">
        {formatPrice(basePrice, locale)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-primary-subtle line-through">
            {formatPrice(compareAtPrice, locale)}
          </span>
          <span className="bg-accent-red-bg text-accent-red text-body-xs font-medium rounded-pill py-1.5 px-3.5">
            {t("off", { percent: discount })}
          </span>
        </>
      )}
    </div>
  );
}
