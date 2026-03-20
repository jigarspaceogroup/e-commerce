"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { QuantitySelector } from "@/components/product/quantity-selector";

interface MiniCartItemProps {
  id: string;
  quantity: number;
  variant: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    stockQuantity: number;
    effectivePrice: number;
  };
  product: {
    titleEn: string;
    titleAr: string;
    slug: string;
    image: { url: string; altTextEn: string } | null;
  };
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function MiniCartItem({
  id,
  quantity,
  variant,
  product,
  onUpdateQuantity,
  onRemove,
}: MiniCartItemProps) {
  const locale = useLocale();
  const title = locale === "ar" ? product.titleAr : product.titleEn;

  return (
    <div className="flex gap-3 py-4 border-b border-border">
      <div className="relative w-16 h-16 flex-shrink-0 bg-surface-warm rounded-sm overflow-hidden">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.altTextEn}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-body-sm font-bold text-primary truncate">{title}</h4>
          <button
            onClick={() => onRemove(id)}
            className="text-primary-subtle hover:text-accent-red flex-shrink-0"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(variant.attributes).map(([key, val]) => (
            <span
              key={key}
              className="text-body-xs text-primary-muted bg-surface-muted px-2 py-0.5 rounded-sm"
            >
              {val}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <QuantitySelector
            value={quantity}
            onChange={(q) => onUpdateQuantity(id, q)}
            max={variant.stockQuantity}
          />
          <span className="text-body-sm font-bold text-primary">
            SAR {(variant.effectivePrice * quantity).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
