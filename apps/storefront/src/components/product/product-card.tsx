"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { PriceDisplay } from "@/components/shared/price-display";
import { RatingStars } from "@/components/ui/rating-stars";
import type { ProductListItem } from "@/types/product";

interface ProductCardProps {
  product: ProductListItem;
  locale: string;
}

export function ProductCard({ product, locale }: ProductCardProps) {
  const t = useTranslations("product");

  const isOutOfStock = product.variants?.every((v) => v.stockQuantity <= 0);
  const hasImages = product.images?.length > 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group transition-transform duration-200 hover:-translate-y-0.5 block"
      data-testid="product-card"
    >
      {/* Image section */}
      <div className="relative aspect-square bg-surface-warm rounded-lg overflow-hidden">
        {hasImages && product.images?.[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].altTextEn ?? product.titleEn}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-primary-subtle">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span className="text-xs">No Image</span>
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute bottom-0 inset-x-0 bg-primary/60 text-white text-xs text-center py-1">
            {t("outOfStock")}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="mt-4 space-y-2">
        <h3 className="text-primary text-body-lg font-bold truncate">
          {locale === "ar" ? product.titleAr : product.titleEn}
        </h3>
        {product.averageRating !== null && product.averageRating !== undefined && (
          <RatingStars rating={product.averageRating ?? 0} size={16} showValue />
        )}
        <PriceDisplay
          basePrice={product.basePrice}
          compareAtPrice={product.compareAtPrice}
          locale={locale}
        />
      </div>
    </Link>
  );
}
