"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductFilters, CategoryTreeNode } from "@/types/product";

interface Facets {
  brands: Array<{ value: string; count: number }>;
  categories: Array<{ id: string; nameEn: string; nameAr: string; count: number }>;
  priceRange: { min: number; max: number };
}

interface ProductFiltersProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  categories?: CategoryTreeNode[];
  facets?: Facets | null;
}

export default function ProductFilters({
  filters,
  onChange,
  categories,
  facets,
}: ProductFiltersProps) {
  const t = useTranslations("filter");
  const locale = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localPriceMin, setLocalPriceMin] = useState(
    filters.priceMin?.toString() ?? ""
  );
  const [localPriceMax, setLocalPriceMax] = useState(
    filters.priceMax?.toString() ?? ""
  );

  // Sync local price state with filters prop
  useEffect(() => {
    setLocalPriceMin(filters.priceMin?.toString() ?? "");
    setLocalPriceMax(filters.priceMax?.toString() ?? "");
  }, [filters.priceMin, filters.priceMax]);

  const handleClearAll = () => {
    onChange({});
    setLocalPriceMin("");
    setLocalPriceMax("");
  };

  const handleCategoryClick = (slug: string) => {
    onChange({
      ...filters,
      categorySlug: filters.categorySlug === slug ? undefined : slug,
    });
  };

  const handlePriceChange = () => {
    const min = localPriceMin ? parseFloat(localPriceMin) : undefined;
    const max = localPriceMax ? parseFloat(localPriceMax) : undefined;

    onChange({
      ...filters,
      priceMin: min,
      priceMax: max,
    });
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePriceChange();
    }
  };

  const handleInStockChange = (checked: boolean) => {
    onChange({
      ...filters,
      inStock: checked || undefined,
    });
  };

  const handleBrandToggle = (brandValue: string) => {
    const currentBrands = filters.brand ? filters.brand.split(",") : [];
    const isSelected = currentBrands.includes(brandValue);

    let updatedBrands: string[];
    if (isSelected) {
      updatedBrands = currentBrands.filter((b) => b !== brandValue);
    } else {
      updatedBrands = [...currentBrands, brandValue];
    }

    onChange({
      ...filters,
      brand: updatedBrands.length > 0 ? updatedBrands.join(",") : undefined,
    });
  };

  const renderFilterSections = () => (
    <>
      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <div className="mb-6 border-t border-border pt-4">
          <h3 className="text-body-lg font-bold text-primary mb-3 flex items-center justify-between">
            {t("category")}
            <ChevronDown size={20} />
          </h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`w-full text-start px-3 py-2 text-sm transition-colors ${
                  filters.categorySlug === category.slug
                    ? "bg-primary text-on-primary rounded-pill font-medium"
                    : "bg-surface-muted text-primary-muted rounded-pill hover:bg-surface-muted/80"
                }`}
              >
                {locale === "ar" ? category.nameAr : category.nameEn}
                {category._count.products > 0 && (
                  <span className="text-primary-subtle ms-1">
                    ({category._count.products})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand Filter */}
      {facets && facets.brands && facets.brands.length > 0 && (
        <div className="mb-6 border-t border-border pt-4">
          <h3 className="text-body-lg font-bold text-primary mb-3 flex items-center justify-between">
            {t("brand")}
            <ChevronDown size={20} />
          </h3>
          <div className="space-y-2">
            {facets.brands.map((brand) => {
              const selectedBrands = filters.brand ? filters.brand.split(",") : [];
              const isSelected = selectedBrands.includes(brand.value);
              return (
                <label
                  key={brand.value}
                  className="flex items-center gap-2 text-sm text-primary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleBrandToggle(brand.value)}
                    className="rounded border-border accent-primary"
                  />
                  <span>
                    {brand.value}{" "}
                    <span className="text-primary-subtle">({brand.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="mb-6 border-t border-border pt-4">
        <h3 className="text-body-lg font-bold text-primary mb-3 flex items-center justify-between">
          {t("priceRange")}
          <ChevronDown size={20} />
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={facets?.priceRange ? `${facets.priceRange.min}` : t("priceMin")}
            value={localPriceMin}
            onChange={(e) => setLocalPriceMin(e.target.value)}
            onBlur={handlePriceChange}
            onKeyDown={handlePriceKeyDown}
            className="w-full border border-border rounded-pill px-3 py-1.5 text-sm focus:outline-2 focus:outline-primary focus:outline-offset-2"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder={facets?.priceRange ? `${facets.priceRange.max}` : t("priceMax")}
            value={localPriceMax}
            onChange={(e) => setLocalPriceMax(e.target.value)}
            onBlur={handlePriceChange}
            onKeyDown={handlePriceKeyDown}
            className="w-full border border-border rounded-pill px-3 py-1.5 text-sm focus:outline-2 focus:outline-primary focus:outline-offset-2"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Availability Filter */}
      <div className="mb-6 border-t border-border pt-4">
        <h3 className="text-body-lg font-bold text-primary mb-3 flex items-center justify-between">
          {t("availability")}
          <ChevronDown size={20} />
        </h3>
        <label className="flex items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={filters.inStock ?? false}
            onChange={(e) => handleInStockChange(e.target.checked)}
            className="rounded border-border accent-primary"
          />
          {t("inStockOnly")}
        </label>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Trigger Button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-primary"
      >
        <SlidersHorizontal size={20} />
        {t("filters")}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[295px] shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">{t("filters")}</h2>
          <Button variant="secondary" size="small" onClick={handleClearAll}>
            {t("clearAll")}
          </Button>
        </div>
        {renderFilterSections()}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-80 bg-white shadow-xl overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">{t("filters")}</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-primary-muted hover:text-primary"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <Button variant="secondary" size="small" onClick={handleClearAll}>
                {t("clearAll")}
              </Button>
            </div>
            {renderFilterSections()}
            <div className="mt-4">
              <Button
                variant="primary"
                size="full"
                onClick={() => setDrawerOpen(false)}
              >
                {t("applyFilters")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
