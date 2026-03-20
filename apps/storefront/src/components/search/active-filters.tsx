"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onRemove: (key: string, value: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  const t = useTranslations("search");
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {filters.map((f) => (
        <button
          key={`${f.key}-${f.value}`}
          onClick={() => onRemove(f.key, f.value)}
          className="inline-flex items-center gap-1 px-3 py-1 bg-surface-muted rounded-pill text-body-sm text-primary hover:bg-surface-warm"
        >
          {f.label}: {f.value}
          <X className="w-3 h-3" />
        </button>
      ))}
      <button onClick={onClearAll} className="text-body-sm text-accent-red hover:underline">
        {t("clearAll")}
      </button>
    </div>
  );
}
