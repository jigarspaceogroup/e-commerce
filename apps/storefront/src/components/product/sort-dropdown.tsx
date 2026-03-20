"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const t = useTranslations("filter");

  return (
    <div className="relative inline-flex items-center">
      <select
        data-testid="sort-dropdown"
        className="appearance-none bg-transparent text-body-md text-primary pe-8 cursor-pointer border-none focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="newest">{t("sortNewest")}</option>
        <option value="price_asc">{t("sortPriceAsc")}</option>
        <option value="price_desc">{t("sortPriceDesc")}</option>
        <option value="popularity">{t("sortPopularity")}</option>
      </select>
      <ChevronDown size={16} className="absolute end-0 pointer-events-none text-primary" />
    </div>
  );
}
