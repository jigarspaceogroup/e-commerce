"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocaleSwitcher } from "../locale-switcher";
import { UserMenu } from "./user-menu";
import { MegaMenu } from "@/components/category/mega-menu";
import { fetchCategoryTree } from "@/lib/api/categories";
import { queryKeys } from "@/lib/query-keys";

export function Header() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const locale = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: fetchCategoryTree,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white relative">
      {/* Top bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-gray-900">
          {t("appName")}
        </Link>

        {/* Categories trigger - desktop only */}
        <button
          data-testid="categories-trigger"
          type="button"
          className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          onClick={() => setMegaMenuOpen(!megaMenuOpen)}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {nav("categories")}
        </button>

        {/* Search - hidden on mobile */}
        <div className="hidden flex-1 px-8 md:block">
          <div className="relative">
            <input
              type="search"
              placeholder={nav("searchPlaceholder")}
              className="w-full rounded-lg border border-gray-300 py-2 pe-4 ps-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <svg
              className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <LocaleSwitcher />

          {/* Cart */}
          <Link
            href="/cart"
            className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label={t("cart")}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </Link>

          {/* User menu - hidden on mobile */}
          <div className="hidden md:block">
            <UserMenu />
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? nav("close") : nav("menu")}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mega Menu */}
      <MegaMenu
        categories={categories ?? []}
        locale={locale}
        isOpen={megaMenuOpen}
        onClose={() => setMegaMenuOpen(false)}
      />

      {/* Mobile search + menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-2 md:hidden">
          <div className="relative mb-3">
            <input
              type="search"
              placeholder={nav("searchPlaceholder")}
              className="w-full rounded-lg border border-gray-300 py-2 pe-4 ps-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <svg
              className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <UserMenu />
        </div>
      )}
    </header>
  );
}
