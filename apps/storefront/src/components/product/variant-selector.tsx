"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PriceDisplay } from "@/components/shared/price-display";
import type { ProductDetailVariant } from "@/types/product";

interface VariantSelectorProps {
  variants: ProductDetailVariant[];
  basePrice: number;
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
  locale: string;
}

export function VariantSelector({ variants, basePrice, selectedVariantId, onSelect, locale }: VariantSelectorProps) {
  const t = useTranslations("product");

  // Extract unique attribute keys from all variants
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    variants.forEach((v) => Object.keys(v.attributes).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [variants]);

  // Get selected variant
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // For each attribute key, get unique values
  const attributeOptions = useMemo(() => {
    return attributeKeys.map((key) => {
      const values = Array.from(new Set(variants.map((v) => v.attributes[key]).filter(Boolean)));
      return { key, values };
    });
  }, [attributeKeys, variants]);

  // Current attribute selections (derived from selected variant)
  const currentAttributes: Record<string, string> = selectedVariant?.attributes ?? {};

  // Handle attribute value click
  const handleAttributeClick = (key: string, value: string | undefined) => {
    if (!value) return;
    const newAttributes = { ...currentAttributes, [key]: value };

    // Find matching variant
    const match = variants.find((v) =>
      Object.entries(newAttributes).every(([k, val]) => v.attributes[k] === val),
    );

    if (match) {
      onSelect(match.id);
    } else {
      // Partial match: find first variant with this attribute value
      const partial = variants.find((v) => v.attributes[key] === value);
      if (partial) onSelect(partial.id);
    }
  };

  // Stock status
  const getStockStatus = (variant: ProductDetailVariant) => {
    if (variant.stockQuantity <= 0) {
      return { label: t("outOfStock"), color: "text-accent-red" };
    }
    if (variant.lowStockThreshold && variant.stockQuantity <= variant.lowStockThreshold) {
      return { label: t("lowStock", { count: variant.stockQuantity }), color: "text-warning" };
    }
    return { label: t("inStock"), color: "text-success" };
  };

  const effectivePrice = selectedVariant?.priceOverride ?? basePrice;
  const stockStatus = selectedVariant ? getStockStatus(selectedVariant) : null;

  return (
    <div data-testid="variant-selector" className="space-y-4">
      {attributeOptions.map(({ key, values }) => (
        <div key={key}>
          <h3 className="text-body-md text-primary-muted mb-2">
            {t("selectVariant", { attribute: key })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const isSelected = currentAttributes[key] === value;
              // Check if this value has any available variants
              const hasStock = variants.some(
                (v) => v.attributes[key] === value && v.stockQuantity > 0,
              );

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAttributeClick(key, value)}
                  disabled={!hasStock}
                  className={`
                    rounded-pill py-3 px-6 text-body-md transition-colors min-w-[44px] min-h-[44px]
                    ${isSelected
                      ? "bg-primary text-on-primary font-medium"
                      : hasStock
                        ? "bg-surface-muted text-primary-muted hover:bg-surface-muted/80"
                        : "bg-surface-muted text-primary-subtle line-through cursor-not-allowed opacity-50"
                    }
                  `}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected variant info */}
      {selectedVariant && (
        <div className="pt-2 space-y-2">
          <PriceDisplay basePrice={effectivePrice} locale={locale} />
          {stockStatus && (
            <p className={`text-body-sm font-medium ${stockStatus.color}`}>{stockStatus.label}</p>
          )}
          <p className="text-body-xs text-primary-subtle">{t("sku", { sku: selectedVariant.sku ?? "" })}</p>
        </div>
      )}
    </div>
  );
}
