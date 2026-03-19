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
      <span className="text-lg font-bold text-gray-900">
        {formatPrice(basePrice, locale)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-gray-500 line-through">
            {formatPrice(compareAtPrice, locale)}
          </span>
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            {t("off", { percent: discount })}
          </span>
        </>
      )}
    </div>
  );
}
