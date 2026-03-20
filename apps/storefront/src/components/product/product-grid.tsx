"use client";

import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/product/product-card";
import { SkeletonCard } from "@/components/shared/loading-skeleton";
import type { ProductListItem } from "@/types/product";

interface ProductGridProps {
  products: ProductListItem[];
  locale: string;
  isLoading?: boolean;
}

export function ProductGrid({ products, locale, isLoading }: ProductGridProps) {
  const t = useTranslations("product");

  return (
    <div
      data-testid="product-grid"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
    >
      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : products.length === 0 ? (
        <div className="col-span-full text-center py-16">
          <p className="text-lg font-medium text-primary mb-2">{t("noProducts")}</p>
          <p className="text-sm text-primary-subtle">{t("noProductsMessage")}</p>
        </div>
      ) : (
        products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))
      )}
    </div>
  );
}
