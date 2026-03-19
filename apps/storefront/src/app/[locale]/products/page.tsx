"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ProductGrid } from "@/components/product/product-grid";
import ProductFilters from "@/components/product/product-filters";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { fetchProducts, parseFiltersFromParams } from "@/lib/api/products";
import { fetchCategoryTree } from "@/lib/api/categories";
import { queryKeys } from "@/lib/query-keys";
import type { ProductFilters as ProductFiltersType } from "@/types/product";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("product");
  const tf = useTranslations("filter");
  const tb = useTranslations("breadcrumb");

  // Parse current filters from URL
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const filters = parseFiltersFromParams(params);

  // Fetch products with infinite query
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

  // Flatten pages into single product array
  const products = data?.pages.flatMap((page) => page.data) ?? [];

  // Update URL params when filters change
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

  const handleFilterChange = (newFilters: ProductFiltersType) => {
    updateFilters(newFilters);
  };

  const breadcrumbItems = [
    { label: tb("home"), href: "/" },
    { label: t("allProducts") },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("allProducts")}</h1>
          {products.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">{t("showingCount", { count: products.length })}</p>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar: ProductFilters handles desktop/mobile visibility internally */}
        <ProductFilters filters={filters} onChange={handleFilterChange} categories={categories} />

        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-end mb-4">
            <SortDropdown value={filters.sortBy ?? "newest"} onChange={handleSortChange} />
          </div>

          <ProductGrid products={products} locale={locale} isLoading={isLoading} />

          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isFetchingNextPage ? t("loading") : t("loadMore")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
