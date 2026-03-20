"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Trash2 } from "lucide-react";
import { QuantitySelector } from "@/components/product/quantity-selector";

interface CartItemProps {
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

export function CartItem({
  id,
  quantity,
  variant,
  product,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const locale = useLocale();
  const title = locale === "ar" ? product.titleAr : product.titleEn;
  const lineTotal = variant.effectivePrice * quantity;

  return (
    <div className="flex gap-4 py-6">
      <div className="relative w-[100px] h-[100px] lg:w-[124px] lg:h-[124px] flex-shrink-0 bg-surface-warm rounded-lg overflow-hidden">
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
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-body-lg font-bold text-primary">{title}</h3>
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
          </div>
          <button
            onClick={() => onRemove(id)}
            className="text-accent-red hover:opacity-70 p-1"
            aria-label="Remove item"
          >
            <Trash2 size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-body-xl font-bold text-primary">
            SAR {lineTotal.toFixed(2)}
          </p>
          <QuantitySelector
            value={quantity}
            onChange={(q) => onUpdateQuantity(id, q)}
            max={variant.stockQuantity}
          />
        </div>
      </div>
    </div>
  );
}
