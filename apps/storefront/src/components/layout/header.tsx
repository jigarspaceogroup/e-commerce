"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { LocaleSwitcher } from "../locale-switcher";
import { UserMenu } from "./user-menu";
import { SearchBar } from "@/components/search/search-bar";
import { MiniCart } from "@/components/cart/mini-cart";

export function Header() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
        <SearchBar className="flex-1 max-w-[577px]" />

        {/* Right Actions */}
        <div className="flex items-center gap-3.5">
          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-primary hover:opacity-70"
            aria-label={t("cart")}
          >
            <ShoppingCart size={24} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-primary text-on-primary text-body-xs flex items-center justify-center">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>

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
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 text-primary hover:opacity-70"
          aria-label={t("cart")}
        >
          <ShoppingCart size={24} />
          {itemCount > 0 && (
            <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-primary text-on-primary text-body-xs flex items-center justify-center">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-border px-4 pb-4 pt-2 lg:hidden">
          {/* Mobile Search */}
          <div className="mb-4">
            <SearchBar className="w-full" />
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

      {/* Mini Cart Drawer */}
      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
