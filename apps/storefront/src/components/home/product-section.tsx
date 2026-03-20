"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { fetchProducts } from "@/lib/api/products";
import { queryKeys } from "@/lib/query-keys";
import type { ProductFilters } from "@/types/product";

interface ProductSectionProps {
  titleKey: string;
  sortBy: ProductFilters["sortBy"];
}

export function ProductSection({ titleKey, sortBy }: ProductSectionProps) {
  const t = useTranslations("home");
  const locale = useLocale();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.list({ sortBy, limit: 4 }),
    queryFn: () => fetchProducts({ sortBy, limit: 4 }),
  });

  const products = data?.data ?? [];

  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1240px] px-4">
        <h2 className="font-heading text-display-lg font-bold text-primary text-center mb-14">
          {t(titleKey)}
        </h2>
        <ProductGrid products={products} locale={locale} isLoading={isLoading} />
        <div className="mt-9 flex justify-center">
          <Link href="/products">
            <Button variant="secondary">{t("viewAll")}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
