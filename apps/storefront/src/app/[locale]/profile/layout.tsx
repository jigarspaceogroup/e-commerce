"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, redirect } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { User, MapPin, Package, Heart, Settings } from "lucide-react";

const sidebarLinks = [
  { href: "/profile" as const, icon: Settings, labelKey: "settings" },
  { href: "/profile/addresses" as const, icon: MapPin, labelKey: "addresses" },
  { href: "/profile/orders" as const, icon: Package, labelKey: "orders" },
  { href: "/profile/wishlist" as const, icon: Heart, labelKey: "wishlist" },
];

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("profile");
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    redirect("/auth/login");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-8">
        <div className="h-8 w-48 bg-surface-muted rounded animate-pulse mb-8" />
        <div className="flex gap-8">
          <div className="hidden lg:block w-[240px] space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
          <div className="flex-1 h-96 bg-surface-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="font-heading text-display-md font-bold text-primary mb-8">
        {t("title")}
      </h1>

      {/* Mobile nav — horizontal scrolling pill tabs */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {sidebarLinks.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-pill whitespace-nowrap text-body-sm transition-colors ${
                isActive
                  ? "bg-primary text-on-primary"
                  : "bg-surface-muted text-primary hover:bg-black/10"
              }`}
            >
              <Icon size={16} />
              {t(`sidebar.${labelKey}`)}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="border border-border rounded-lg p-4">
            {/* User info header */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center">
                <User size={20} className="text-primary-muted" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-bold text-body-md text-primary truncate">
                  {user?.firstName ?? ""}
                </p>
              </div>
            </div>

            <nav className="space-y-1">
              {sidebarLinks.map(({ href, icon: Icon, labelKey }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-md transition-colors ${
                      isActive
                        ? "bg-surface-muted font-bold text-primary"
                        : "text-primary-muted hover:bg-surface-muted/50 hover:text-primary"
                    }`}
                  >
                    <Icon size={18} />
                    {t(`sidebar.${labelKey}`)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
