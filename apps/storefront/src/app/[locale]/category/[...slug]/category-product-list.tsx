"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ProductGrid } from "@/components/product/product-grid";
import ProductFilters from "@/components/product/product-filters";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { fetchProducts, parseFiltersFromParams } from "@/lib/api/products";
import { fetchCategoryTree } from "@/lib/api/categories";
import { queryKeys } from "@/lib/query-keys";
import type { CategoryDetail, ProductFilters as ProductFiltersType, CategoryTreeNode } from "@/types/product";

interface CategoryProductListProps {
  category: CategoryDetail;
  categorySlug: string;
  locale: string;
  slugSegments: string[];
  initialSearchParams: Record<string, string>;
}

export function CategoryProductList({
  category,
  categorySlug,
  locale,
  slugSegments,
  initialSearchParams,
}: CategoryProductListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("product");
  const tb = useTranslations("breadcrumb");

  // Parse filters from URL
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const filters: ProductFiltersType = {
    ...parseFiltersFromParams(params),
    categorySlug,
  };

  // Fetch products
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ pageParam }) => fetchProducts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    initialPageParam: undefined as string | undefined,
  });

  // Fetch category tree for breadcrumb name resolution
  const { data: categoryTree } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: fetchCategoryTree,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.pages.flatMap((page) => page.data) ?? [];

  // Build breadcrumbs
  const categoryName = locale === "ar" ? category.nameAr : category.nameEn;
  const breadcrumbItems = [
    { label: tb("home"), href: "/" },
  ];

  // Add parent segments from URL path
  for (let i = 0; i < slugSegments.length - 1; i++) {
    // Try to find the category name from the tree
    const segmentSlug = slugSegments[i];
    let segmentName = segmentSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Search tree for matching slug
    if (categoryTree) {
      const found = findCategoryBySlug(categoryTree, segmentSlug);
      if (found) {
        segmentName = locale === "ar" ? found.nameAr : found.nameEn;
      }
    }

    breadcrumbItems.push({
      label: segmentName,
      href: `/category/${slugSegments.slice(0, i + 1).join("/")}`,
    });
  }

  // Last segment = current category (no link)
  breadcrumbItems.push({ label: categoryName });

  const updateFilters = (newFilters: ProductFiltersType) => {
    const urlParams = new URLSearchParams();
    if (newFilters.sortBy) urlParams.set("sortBy", newFilters.sortBy);
    if (newFilters.priceMin !== undefined) urlParams.set("priceMin", String(newFilters.priceMin));
    if (newFilters.priceMax !== undefined) urlParams.set("priceMax", String(newFilters.priceMax));
    if (newFilters.brand) urlParams.set("brand", newFilters.brand);
    if (newFilters.inStock) urlParams.set("inStock", "true");
    const queryStr = urlParams.toString();
    router.push(queryStr ? `?${queryStr}` : "");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{categoryName}</h1>
        {category.descriptionEn && (
          <p className="mt-1 text-sm text-gray-500">
            {locale === "ar" ? (category.descriptionAr ?? category.descriptionEn) : category.descriptionEn}
          </p>
        )}
        {products.length > 0 && (
          <p className="mt-1 text-sm text-gray-500">{t("showingCount", { count: products.length })}</p>
        )}
      </div>

      <div className="flex gap-8">
        <ProductFilters
          filters={filters}
          onChange={updateFilters}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-end mb-4">
            <SortDropdown
              value={filters.sortBy ?? "newest"}
              onChange={(sortBy) => updateFilters({ ...filters, sortBy: sortBy as ProductFiltersType["sortBy"] })}
            />
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

// Helper to find a category by slug in the tree
function findCategoryBySlug(
  tree: CategoryTreeNode[],
  slug: string,
): { nameEn: string; nameAr: string } | null {
  for (const cat of tree) {
    if (cat.slug === slug) return cat;
    if (cat.children?.length) {
      const found = findCategoryBySlug(cat.children, slug);
      if (found) return found;
    }
  }
  return null;
}
