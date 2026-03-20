"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const styles = [
  { key: "Casual", slug: "casual", colSpan: "lg:col-span-4" },
  { key: "Formal", slug: "formal", colSpan: "lg:col-span-6" },
  { key: "Party", slug: "party", colSpan: "lg:col-span-6" },
  { key: "Gym", slug: "gym", colSpan: "lg:col-span-4" },
];

export function BrowseByStyle() {
  const t = useTranslations("home");

  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1240px] px-4">
        <div className="bg-surface-muted rounded-xl p-6 lg:p-16">
          <h2 className="font-heading text-display-lg font-bold text-primary text-center mb-14">
            {t("browseByStyle")}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
            {styles.map((style) => (
              <Link
                key={style.key}
                href={`/category/${style.slug}`}
                className={`relative bg-surface rounded-lg overflow-hidden h-[200px] lg:h-[289px] ${style.colSpan}`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-muted/30" />
                <span className="absolute top-6 start-7 font-heading text-display-sm font-bold text-primary">
                  {style.key}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
