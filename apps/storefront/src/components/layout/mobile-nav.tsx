"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { MobileCategoryMenu } from "@/components/category/mobile-category-menu";
import { Home, LayoutGrid, User, ShoppingCart } from "lucide-react";

export function MobileNav() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const pathname = usePathname();
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const items = [
    {
      label: t("home"),
      href: "/",
      icon: <Home size={20} />,
    },
    {
      label: nav("categories"),
      href: "/categories",
      icon: <LayoutGrid size={20} />,
    },
    {
      label: t("cart"),
      href: "/cart",
      icon: <ShoppingCart size={20} />,
    },
    {
      label: t("account"),
      href: "/profile",
      icon: <User size={20} />,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {items.map((item) => {
          // Check if current path matches (strip locale prefix)
          const pathSegments = pathname.split("/").filter(Boolean);
          const pathWithoutLocale = "/" + pathSegments.slice(1).join("/");
          const isActive = item.href === "/" ? pathWithoutLocale === "/" : pathWithoutLocale.startsWith(item.href);

          // Categories opens menu instead of navigating
          if (item.href === "/categories") {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setCategoryMenuOpen(true)}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-xs ${
                  categoryMenuOpen ? "text-primary" : "text-primary-subtle hover:text-primary-muted"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs ${
                isActive ? "text-primary" : "text-primary-subtle hover:text-primary-muted"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <MobileCategoryMenu isOpen={categoryMenuOpen} onClose={() => setCategoryMenuOpen(false)} />
    </nav>
  );
}
