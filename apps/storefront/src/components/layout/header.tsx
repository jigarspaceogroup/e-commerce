"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Search, ShoppingCart, Menu, X } from "lucide-react";
import { LocaleSwitcher } from "../locale-switcher";
import { UserMenu } from "./user-menu";

export function Header() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/shop" as const, label: "Shop" },
    { href: "/sale" as const, label: "On Sale" },
    { href: "/new" as const, label: "New Arrivals" },
    { href: "/brands" as const, label: "Brands" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center gap-6 max-w-[1240px] mx-auto px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-heading-lg font-bold text-primary whitespace-nowrap"
        >
          SHOP.CO
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-md text-primary hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-[577px]">
          <Search
            size={18}
            className="absolute start-4 top-1/2 -translate-y-1/2 text-primary-subtle"
          />
          <input
            type="search"
            placeholder={nav("searchPlaceholder")}
            className="w-full bg-surface-muted rounded-pill py-3 ps-11 pe-4 text-body-md placeholder:text-primary-subtle focus:outline-none"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3.5">
          {/* Cart */}
          <Link
            href="/cart"
            className="p-2 text-primary hover:opacity-70"
            aria-label={t("cart")}
          >
            <ShoppingCart size={24} />
          </Link>

          {/* User Menu */}
          <UserMenu />

          {/* Locale Switcher */}
          <LocaleSwitcher />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex lg:hidden items-center justify-between px-4 py-3">
        {/* Hamburger Menu */}
        <button
          type="button"
          className="p-2 text-primary hover:opacity-70"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? nav("close") : nav("menu")}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Centered Logo */}
        <Link
          href="/"
          className="font-heading text-heading-lg font-bold text-primary whitespace-nowrap"
        >
          SHOP.CO
        </Link>

        {/* Cart */}
        <Link
          href="/cart"
          className="p-2 text-primary hover:opacity-70"
          aria-label={t("cart")}
        >
          <ShoppingCart size={24} />
        </Link>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-border px-4 pb-4 pt-2 lg:hidden">
          {/* Mobile Search */}
          <div className="relative mb-4">
            <Search
              size={18}
              className="absolute start-4 top-1/2 -translate-y-1/2 text-primary-subtle"
            />
            <input
              type="search"
              placeholder={nav("searchPlaceholder")}
              className="w-full bg-surface-muted rounded-pill py-3 ps-11 pe-4 text-body-md placeholder:text-primary-subtle focus:outline-none"
            />
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex flex-col gap-4 mb-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-md text-primary hover:underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile User Menu */}
          <div className="mb-4">
            <UserMenu />
          </div>

          {/* Mobile Locale Switcher */}
          <LocaleSwitcher />
        </div>
      )}
    </header>
  );
}
