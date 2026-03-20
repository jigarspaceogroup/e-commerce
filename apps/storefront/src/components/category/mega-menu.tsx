"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { CategoryTreeNode } from "@/types/product";
import { ChevronRight } from "lucide-react";

interface MegaMenuProps {
  categories: CategoryTreeNode[];
  locale: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MegaMenu({ categories, locale, isOpen, onClose }: MegaMenuProps) {
  const t = useTranslations("category");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      data-testid="mega-menu"
      className="absolute inset-x-0 top-full bg-surface border border-border rounded-lg shadow-lg z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-lg font-semibold text-primary mb-4">{t("shopByCategory")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div key={cat.id}>
              <Link
                href={`/category/${cat.slug}`}
                onClick={onClose}
                className="font-medium text-primary hover:text-primary block mb-2"
              >
                {locale === "ar" ? cat.nameAr : cat.nameEn}
              </Link>
              <ul className="space-y-1">
                {cat.children.slice(0, 8).map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/category/${cat.slug}/${child.slug}`}
                      onClick={onClose}
                      className="text-sm text-primary-muted hover:text-primary block py-0.5"
                    >
                      {locale === "ar" ? child.nameAr : child.nameEn}
                      <span className="text-xs text-primary-subtle ms-1">({child._count.products})</span>
                    </Link>
                  </li>
                ))}
                {cat.children.length > 8 && (
                  <li>
                    <Link
                      href={`/category/${cat.slug}`}
                      onClick={onClose}
                      className="text-sm text-primary hover:underline block py-0.5"
                    >
                      {t("viewAll")}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
