"use client";

import { useTranslations } from "next-intl";

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const t = useTranslations("filter");

  return (
    <select
      data-testid="sort-dropdown"
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="newest">{t("sortNewest")}</option>
      <option value="price_asc">{t("sortPriceAsc")}</option>
      <option value="price_desc">{t("sortPriceDesc")}</option>
      <option value="popularity">{t("sortPopularity")}</option>
    </select>
  );
}
