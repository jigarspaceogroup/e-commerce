"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ProductGrid } from "@/components/product/product-grid";
import ProductFilters from "@/components/product/product-filters";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { Button } from "@/components/ui/button";
import { fetchProducts, parseFiltersFromParams } from "@/lib/api/products";
import { fetchCategoryTree } from "@/lib/api/categories";
import { queryKeys } from "@/lib/query-keys";
import type { ProductFilters as ProductFiltersType } from "@/types/product";

export function ProductListingClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("product");
  const tb = useTranslations("breadcrumb");

  // Parse current filters from URL
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const filters = parseFiltersFromParams(params);

  // Fetch products with infinite query (will use prefetched data from SSR)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ pageParam }) => fetchProducts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });

  // Fetch categories for filter sidebar
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: fetchCategoryTree,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.pages.flatMap((page) => page.data) ?? [];

  const updateFilters = (newFilters: ProductFiltersType) => {
    const urlParams = new URLSearchParams();
    if (newFilters.sortBy) urlParams.set("sortBy", newFilters.sortBy);
    if (newFilters.priceMin !== undefined) urlParams.set("priceMin", String(newFilters.priceMin));
    if (newFilters.priceMax !== undefined) urlParams.set("priceMax", String(newFilters.priceMax));
    if (newFilters.brand) urlParams.set("brand", newFilters.brand);
    if (newFilters.inStock) urlParams.set("inStock", "true");
    if (newFilters.categorySlug) urlParams.set("categorySlug", newFilters.categorySlug);
    router.push(`?${urlParams.toString()}`);
  };

  const handleSortChange = (sortBy: string) => {
    updateFilters({ ...filters, sortBy: sortBy as ProductFiltersType["sortBy"] });
  };

  const breadcrumbItems = [
    { label: tb("home"), href: "/" },
    { label: t("allProducts") },
  ];

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-display-md font-bold text-primary">{t("allProducts")}</h1>
          {products.length > 0 && (
            <p className="mt-1 text-sm text-primary-subtle">{t("showingCount", { count: products.length })}</p>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        <ProductFilters filters={filters} onChange={updateFilters} categories={categories} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-end mb-4">
            <SortDropdown value={filters.sortBy ?? "newest"} onChange={handleSortChange} />
          </div>
          <ProductGrid products={products} locale={locale} isLoading={isLoading} />
          {hasNextPage && (
            <div className="mt-8 text-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="secondary"
              >
                {isFetchingNextPage ? t("loading") : t("loadMore")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
