"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";

interface Suggestion {
  type: "product" | "category" | "brand";
  textEn: string;
  textAr: string;
  url: string;
}

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  query: string;
  locale: string;
  activeIndex: number;
  onSelect: (url: string) => void;
}

export function SearchSuggestions({
  suggestions,
  isLoading,
  query,
  locale,
  activeIndex,
  onSelect,
}: SearchSuggestionsProps) {
  const t = useTranslations("search");

  if (isLoading) {
    return (
      <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-lg shadow-lg z-50 p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary-muted" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-lg shadow-lg z-50 p-4">
        <p className="text-body-sm text-primary-muted">{t("noSuggestions", { query })}</p>
      </div>
    );
  }

  const grouped = {
    product: suggestions.filter((s) => s.type === "product"),
    category: suggestions.filter((s) => s.type === "category"),
    brand: suggestions.filter((s) => s.type === "brand"),
  };

  let flatIndex = 0;

  const renderGroup = (items: Suggestion[], label: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-4 py-2 text-body-xs text-primary-subtle font-bold uppercase">{label}</div>
        {items.map((item) => {
          const currentIndex = flatIndex++;
          const isActive = currentIndex === activeIndex;
          return (
            <button
              key={`${item.type}-${item.url}`}
              className={`w-full text-start px-4 py-2 text-body-sm text-primary hover:bg-surface-muted ${isActive ? "bg-surface-muted" : ""}`}
              onClick={() => onSelect(item.url)}
              role="option"
              aria-selected={isActive}
            >
              {locale === "ar" ? item.textAr : item.textEn}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden" role="listbox">
      {renderGroup(grouped.product, t("products"))}
      {renderGroup(grouped.category, t("categories"))}
      {renderGroup(grouped.brand, t("brands"))}
      <Link
        href={`/search?q=${encodeURIComponent(query)}`}
        className="block px-4 py-3 text-body-sm font-medium text-primary hover:bg-surface-muted border-t border-border"
      >
        {t("viewAll", { query })}
      </Link>
    </div>
  );
}
