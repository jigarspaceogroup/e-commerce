"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FacetItem {
  value: string;
  count: number;
}

interface CategoryFacet {
  id: string;
  nameEn: string;
  nameAr: string;
  count: number;
}

interface SearchFiltersProps {
  brands: FacetItem[];
  categories: CategoryFacet[];
  priceRange: { min: number; max: number };
  selectedBrands: string[];
  selectedCategoryId?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  locale: string;
  onBrandChange: (brands: string[]) => void;
  onCategoryChange: (categoryId: string | undefined) => void;
  onPriceChange: (min?: number, max?: number) => void;
  onInStockChange: (inStock: boolean) => void;
  onClearAll: () => void;
}

export function SearchFilters({
  brands, categories, priceRange, selectedBrands, selectedCategoryId,
  priceMin, priceMax, inStock, locale,
  onBrandChange, onCategoryChange, onPriceChange, onInStockChange, onClearAll,
}: SearchFiltersProps) {
  const t = useTranslations("search");
  const [localPriceMin, setLocalPriceMin] = useState(priceMin?.toString() ?? "");
  const [localPriceMax, setLocalPriceMax] = useState(priceMax?.toString() ?? "");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handlePriceApply = () => {
    onPriceChange(
      localPriceMin ? Number(localPriceMin) : undefined,
      localPriceMax ? Number(localPriceMax) : undefined,
    );
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-body-md font-bold text-primary mb-3">{t("category")}</h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id === selectedCategoryId ? undefined : cat.id)}
                className={`flex items-center justify-between w-full text-start py-1 text-body-sm ${
                  cat.id === selectedCategoryId ? "text-primary font-bold" : "text-primary-muted"
                }`}
              >
                <span>{locale === "ar" ? cat.nameAr : cat.nameEn}</span>
                <span className="text-primary-subtle text-body-xs">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-body-md font-bold text-primary mb-3">{t("brand")}</h3>
          <div className="space-y-2">
            {brands.map((brand) => (
              <label key={brand.value} className="flex items-center gap-2 text-body-sm text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.value)}
                  onChange={() => {
                    const next = selectedBrands.includes(brand.value)
                      ? selectedBrands.filter((b) => b !== brand.value)
                      : [...selectedBrands, brand.value];
                    onBrandChange(next);
                  }}
                  className="w-4 h-4 rounded border-border"
                />
                <span>{brand.value}</span>
                <span className="text-primary-subtle text-body-xs ms-auto">({brand.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="text-body-md font-bold text-primary mb-3">{t("priceRange")}</h3>
        <div className="flex gap-2 items-center">
          <Input
            placeholder={String(priceRange.min)}
            value={localPriceMin}
            onChange={(e) => setLocalPriceMin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePriceApply()}
            type="number"
          />
          <span className="text-primary-muted">—</span>
          <Input
            placeholder={String(priceRange.max)}
            value={localPriceMax}
            onChange={(e) => setLocalPriceMax(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePriceApply()}
            type="number"
          />
        </div>
      </div>

      {/* In Stock Toggle */}
      <label className="flex items-center gap-2 text-body-sm text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={inStock ?? false}
          onChange={(e) => onInStockChange(e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        {t("inStockOnly")}
      </label>

      {/* Clear All */}
      <button onClick={onClearAll} className="text-body-sm text-accent-red hover:underline">
        {t("clearAll")}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        className="lg:hidden flex items-center gap-2 text-body-sm text-primary"
        onClick={() => setIsMobileOpen(true)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t("filters")}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[295px] flex-shrink-0">{filterContent}</aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-[300px] bg-surface p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-md font-heading font-bold">{t("filters")}</h2>
              <button onClick={() => setIsMobileOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
}
