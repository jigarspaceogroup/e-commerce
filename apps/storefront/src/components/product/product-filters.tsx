"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { ProductFilters, CategoryTreeNode } from "@/types/product";

interface ProductFiltersProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  categories?: CategoryTreeNode[];
}

export default function ProductFilters({
  filters,
  onChange,
  categories,
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

  const renderFilterSections = () => (
    <>
      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {t("category")}
          </h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                  filters.categorySlug === category.slug
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {locale === "ar" ? category.nameAr : category.nameEn}
                {category._count.products > 0 && (
                  <span className="text-gray-500 ms-1">
                    ({category._count.products})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          {t("priceRange")}
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t("priceMin")}
            value={localPriceMin}
            onChange={(e) => setLocalPriceMin(e.target.value)}
            onBlur={handlePriceChange}
            onKeyDown={handlePriceKeyDown}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder={t("priceMax")}
            value={localPriceMax}
            onChange={(e) => setLocalPriceMax(e.target.value)}
            onBlur={handlePriceChange}
            onKeyDown={handlePriceKeyDown}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Availability Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          {t("availability")}
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.inStock ?? false}
            onChange={(e) => handleInStockChange(e.target.checked)}
            className="rounded border-gray-300"
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
        className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {t("filters")}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("filters")}</h2>
          <button
            onClick={handleClearAll}
            className="text-sm text-blue-600 hover:underline"
          >
            {t("clearAll")}
          </button>
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
              <h2 className="text-lg font-semibold">{t("filters")}</h2>
              <button
                onClick={handleClearAll}
                className="text-sm text-blue-600 hover:underline"
              >
                {t("clearAll")}
              </button>
            </div>
            {renderFilterSections()}
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium"
            >
              {t("applyFilters")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
