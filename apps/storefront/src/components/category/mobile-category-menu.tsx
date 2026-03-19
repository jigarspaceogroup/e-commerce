"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { fetchCategoryTree } from "@/lib/api/categories";
import { queryKeys } from "@/lib/query-keys";
import type { CategoryTreeNode } from "@/types/product";

interface MobileCategoryMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileCategoryMenu({ isOpen, onClose }: MobileCategoryMenuProps) {
  const locale = useLocale();
  const t = useTranslations("category");
  const tc = useTranslations("common");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: fetchCategoryTree,
    staleTime: 5 * 60 * 1000,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold">{t("allCategories")}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700"
          aria-label={tc("back")}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Category List */}
      <ul className="divide-y divide-gray-100">
        {categories?.map((cat) => (
          <li key={cat.id}>
            {cat.children && cat.children.length > 0 ? (
              <>
                {/* Parent Category - Expandable */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                  className="flex items-center justify-between w-full px-4 py-3 text-start min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {locale === "ar" ? cat.nameAr : cat.nameEn}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t("productsCount", { count: cat._count.products })}
                    </span>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedId === cat.id ? "rotate-90 rtl:-rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Children - Expanded */}
                {expandedId === cat.id && (
                  <ul className="bg-gray-50 py-1 transition-all duration-200">
                    {cat.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/category/${cat.slug}/${child.slug}`}
                          onClick={onClose}
                          className="flex items-center justify-between px-8 py-2.5 text-sm min-h-[44px]"
                        >
                          <span>{locale === "ar" ? child.nameAr : child.nameEn}</span>
                          <span className="text-xs text-gray-400">
                            {t("productsCount", { count: child._count.products })}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              /* Leaf Category - Direct Link */
              <Link
                href={`/category/${cat.slug}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 min-h-[44px]"
              >
                <span className="font-medium">
                  {locale === "ar" ? cat.nameAr : cat.nameEn}
                </span>
                <span className="text-xs text-gray-400">
                  {t("productsCount", { count: cat._count.products })}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
