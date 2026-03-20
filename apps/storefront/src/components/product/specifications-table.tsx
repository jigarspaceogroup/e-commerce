"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface SpecificationsTableProps {
  specifications: Record<string, { en: string; ar: string }> | null;
  locale: string;
}

export function SpecificationsTable({
  specifications,
  locale,
}: SpecificationsTableProps) {
  const t = useTranslations("product");

  if (!specifications || Object.keys(specifications).length === 0) {
    return null;
  }

  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(specifications);
  const visibleEntries = expanded ? entries : entries.slice(0, 6);
  const hasMore = entries.length > 6;

  return (
    <div data-testid="specifications-table">
      <h2 className="text-lg font-semibold text-primary mb-3">
        {t("specifications")}
      </h2>
      <table className="w-full">
        <tbody className="divide-y divide-border">
          {visibleEntries.map(([key, value]) => (
            <tr key={key}>
              <td className="py-2 pe-4 text-sm font-medium text-primary-muted w-1/3">
                {key}
              </td>
              <td className="py-2 text-sm text-primary">
                {locale === "ar" ? value.ar || value.en : value.en || value.ar}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-primary underline"
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      )}
    </div>
  );
}

export default SpecificationsTable;
