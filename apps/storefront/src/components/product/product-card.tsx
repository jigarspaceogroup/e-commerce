"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { PriceDisplay } from "@/components/shared/price-display";
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
      className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group block"
      data-testid="product-card"
    >
      {/* Image section */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {hasImages && product.images?.[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].altTextEn ?? product.titleEn}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
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
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs text-center py-1">
            {t("outOfStock")}
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
          {locale === "ar" ? product.titleAr : product.titleEn}
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          {locale === "ar" ? product.category.nameAr : product.category.nameEn}
        </p>
        <PriceDisplay
          basePrice={product.basePrice}
          compareAtPrice={product.compareAtPrice}
          locale={locale}
        />
      </div>
    </Link>
  );
}
