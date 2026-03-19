import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { redirect } from "next/navigation";
import type { CategoryDetail } from "@/types/product";
import { CategoryProductList } from "./category-product-list";

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const categorySlug = slug[slug.length - 1];

  try {
    const category = await serverFetch<CategoryDetail>(`/categories/${categorySlug}`);
    const title = locale === "ar" ? (category.seoTitleAr ?? category.nameAr) : (category.seoTitleEn ?? category.nameEn);
    const description = locale === "ar"
      ? (category.seoDescriptionAr ?? category.descriptionAr)
      : (category.seoDescriptionEn ?? category.descriptionEn);
    return { title, description: description ?? undefined };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const categorySlug = slug[slug.length - 1];

  let category: CategoryDetail;
  try {
    const result = await serverFetch<CategoryDetail | { redirect: string }>(`/categories/${categorySlug}`);
    if (result && "redirect" in result) {
      redirect(`/${locale}/category/${(result as { redirect: string }).redirect}`);
    }
    category = result as CategoryDetail;
  } catch {
    redirect(`/${locale}/products`);
  }

  return (
    <CategoryProductList
      category={category}
      categorySlug={categorySlug}
      locale={locale}
      slugSegments={slug}
      initialSearchParams={resolvedSearchParams}
    />
  );
}
