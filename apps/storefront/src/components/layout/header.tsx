"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocaleSwitcher } from "../locale-switcher";
import { UserMenu } from "./user-menu";

export function Header() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      {/* Top bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-gray-900">
          {t("appName")}
        </Link>

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
