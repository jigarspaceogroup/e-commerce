import type { Metadata } from "next";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { serverFetch, serverFetchPaginated, parseDecimalFields } from "@/lib/api/server";
import { redirect } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import type { CategoryDetail, ProductListItem } from "@/types/product";
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
    if (result && "redirect" in result && typeof result.redirect === "string") {
      redirect(`/${locale}/category/${result.redirect}`);
    }
    category = result as CategoryDetail;
  } catch {
    redirect(`/${locale}/products`);
  }

  const queryClient = new QueryClient();

  // Prefetch products for this category
  try {
    const categoryFilters = { categorySlug };
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.list(categoryFilters),
      queryFn: async () => {
        const result = await serverFetchPaginated<ProductListItem>("/products", { categorySlug: categorySlug ?? "" });
        return {
          data: result.data.map((p) => parseDecimalFields(p as unknown as Record<string, unknown>, ["basePrice", "compareAtPrice"]) as unknown as ProductListItem),
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        };
      },
      initialPageParam: undefined as string | undefined,
    });
  } catch {
    // Non-fatal
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoryProductList
        category={category}
        categorySlug={categorySlug ?? ""}
        locale={locale}
        slugSegments={slug}
        initialSearchParams={resolvedSearchParams}
      />
    </HydrationBoundary>
  );
}
