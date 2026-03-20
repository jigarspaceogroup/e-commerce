"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="secondary" size="small">{t("login")}</Button>
        </Link>
        <Link href="/register">
          <Button size="small">{t("register")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-surface-muted"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-primary">
          {user?.firstName?.charAt(0).toUpperCase()}
        </div>
        <span className="hidden lg:inline">{user?.firstName}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-48 rounded-md border border-border bg-surface py-1 shadow-lg">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-primary hover:bg-surface-muted"
          >
            {nav("myProfile")}
          </Link>
          <Link
            href="/orders"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-primary hover:bg-surface-muted"
          >
            {nav("myOrders")}
          </Link>
          <Link
            href="/wishlist"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-primary hover:bg-surface-muted"
          >
            {nav("myWishlist")}
          </Link>
          <hr className="my-1" />
          <button
            type="button"
            onClick={() => { setOpen(false); logout(); }}
            className="block w-full px-4 py-2 text-start text-sm text-accent-red hover:bg-surface-muted"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
