"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const stats = [
  { value: "200+", key: "statBrands" },
  { value: "2,000+", key: "statProducts" },
  { value: "30,000+", key: "statCustomers" },
] as const;

export function HeroSection() {
  const t = useTranslations("home.hero");

  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-[1240px] px-4 lg:px-0">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 py-10 lg:py-0">
          {/* Text content */}
          <div className="flex-1 flex flex-col justify-center py-10 lg:py-24">
            <h1 className="font-heading text-display-xl font-bold text-primary max-w-[550px]">
              {t("title")}
            </h1>
            <p className="mt-5 text-body-md text-primary-muted max-w-[545px]">
              {t("subtitle")}
            </p>
            <div className="mt-8">
              <Link href="/products">
                <Button>{t("cta")}</Button>
              </Link>
            </div>
            {/* Stats */}
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 divide-x divide-border rtl:divide-x-reverse">
              {stats.map((stat, i) => (
                <div key={stat.key} className={i > 0 ? "ps-8" : ""}>
                  <p className="font-heading text-display-md font-bold text-primary">{stat.value}</p>
                  <p className="text-body-md text-primary-muted">{t(stat.key)}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Hero image placeholder */}
          <div className="flex-1 relative min-h-[400px] lg:min-h-[600px] w-full lg:w-auto flex items-end justify-center overflow-hidden">
            <div className="w-full h-full bg-surface-alt flex items-center justify-center text-primary-subtle text-body-lg">
              {/* Placeholder — replace with actual hero image */}
              <div className="w-full h-full bg-gradient-to-b from-surface-alt to-surface-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
