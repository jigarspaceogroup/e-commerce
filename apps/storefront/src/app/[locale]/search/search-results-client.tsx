"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchSearchResults } from "@/lib/api/search";
import { queryKeys } from "@/lib/query-keys";
import { ProductCard } from "@/components/product/product-card";
import { SearchFilters } from "@/components/search/search-filters";
import { ActiveFilters } from "@/components/search/active-filters";
import { Link } from "@/i18n/navigation";

interface SearchResultsClientProps {
  initialQuery: string;
}

export function SearchResultsClient({ initialQuery }: SearchResultsClientProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL
  const q = searchParams.get("q") ?? initialQuery;
  const categoryId = searchParams.get("category_id") ?? undefined;
  const brands = searchParams.getAll("brand");
  const priceMin = searchParams.get("price_min") ? Number(searchParams.get("price_min")) : undefined;
  const priceMax = searchParams.get("price_max") ? Number(searchParams.get("price_max")) : undefined;
  const inStock = searchParams.get("in_stock") === "true" ? true : undefined;
  const sort = (searchParams.get("sort") as "relevance" | "price_asc" | "price_desc" | "newest") ?? "relevance";

  const filters = { q, categoryId, brands, priceMin, priceMax, inStock, sort };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.search.results(filters),
    queryFn: () => fetchSearchResults(filters),
    enabled: !!q,
  });

  const products = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const facets = meta?.facets;

  // "Did you mean" — on zero results, show a link to retry without filters
  const showDidYouMean = !isLoading && products.length === 0 && (brands.length > 0 || priceMin || priceMax || categoryId);

  // URL update helper
  const updateParams = (updates: Record<string, string | string[] | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      params.delete(key);
      if (val !== undefined) {
        if (Array.isArray(val)) {
          val.forEach((v) => params.append(key, v));
        } else {
          params.set(key, val);
        }
      }
    }
    router.replace(`/search?${params.toString()}`);
  };

  // Build active filters list for chip bar
  const activeFilters = [
    ...brands.map((b) => ({ key: "brand", label: t("brand"), value: b })),
    ...(priceMin ? [{ key: "price_min", label: t("priceRange"), value: `${priceMin}+` }] : []),
    ...(priceMax ? [{ key: "price_max", label: t("priceRange"), value: `≤${priceMax}` }] : []),
    ...(inStock ? [{ key: "in_stock", label: t("inStockOnly"), value: "✓" }] : []),
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-8">
        <div className="animate-shimmer h-8 w-64 rounded-md mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Heading */}
      <h1 className="text-display-md font-heading font-bold text-primary mb-2">
        {t("resultsFor", { query: q })}
      </h1>
      <p className="text-body-md text-primary-muted mb-6">
        {t("resultCount", { count: total })}
      </p>

      {/* "Did you mean" */}
      {showDidYouMean && (
        <p className="text-body-md text-primary-muted mb-4">
          {t("didYouMean")}{" "}
          <button
            onClick={() => updateParams({ brand: undefined, price_min: undefined, price_max: undefined, category_id: undefined, in_stock: undefined })}
            className="text-primary font-medium underline"
          >
            {q}
          </button>
        </p>
      )}

      {/* Active filter chips */}
      <ActiveFilters
        filters={activeFilters}
        onRemove={(key, value) => {
          if (key === "brand") {
            updateParams({ brand: brands.filter((b) => b !== value) });
          } else {
            updateParams({ [key]: undefined });
          }
        }}
        onClearAll={() => updateParams({ brand: undefined, price_min: undefined, price_max: undefined, category_id: undefined, in_stock: undefined })}
      />

      {/* Sort dropdown */}
      <div className="flex items-center justify-between mb-6">
        <SearchFilters
          brands={facets?.brands ?? []}
          categories={facets?.categories ?? []}
          priceRange={facets?.priceRange ?? { min: 0, max: 1000 }}
          selectedBrands={brands}
          selectedCategoryId={categoryId}
          priceMin={priceMin}
          priceMax={priceMax}
          inStock={inStock}
          locale={locale}
          onBrandChange={(b) => updateParams({ brand: b })}
          onCategoryChange={(id) => updateParams({ category_id: id })}
          onPriceChange={(min, max) => updateParams({ price_min: min?.toString(), price_max: max?.toString() })}
          onInStockChange={(v) => updateParams({ in_stock: v ? "true" : undefined })}
          onClearAll={() => updateParams({ brand: undefined, price_min: undefined, price_max: undefined, category_id: undefined, in_stock: undefined })}
        />
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="bg-surface-muted rounded-pill px-4 py-2 text-body-sm text-primary"
        >
          <option value="relevance">{t("relevance")}</option>
          <option value="price_asc">{t("priceAsc")}</option>
          <option value="price_desc">{t("priceDesc")}</option>
          <option value="newest">{t("newest")}</option>
        </select>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex gap-8">
        {/* Desktop filter sidebar renders inside SearchFilters */}
        <div className="flex-1">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-heading-md font-heading font-bold text-primary mb-2">{t("noResults", { query: q })}</h2>
              <p className="text-body-md text-primary-muted mb-6">{t("noResultsHint")}</p>
              <Link href="/products" className="text-primary font-medium underline">
                {t("browseCategoriesTitle")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
