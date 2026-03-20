"use client";

import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  items: Array<{ label: string; href?: string }>;
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="text-body-sm">
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight size={14} className="text-primary-subtle rtl:rotate-180 mx-2" />
              )}
              {isLast ? (
                <span className="text-primary font-medium">{item.label}</span>
              ) : item.href ? (
                <Link href={item.href} className="text-primary-muted hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="text-primary-muted">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
