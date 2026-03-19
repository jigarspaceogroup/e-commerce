import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { serverFetchPaginated, parseDecimalFields } from "@/lib/api/server";
import { parseFiltersFromParams } from "@/lib/api/products";
import { queryKeys } from "@/lib/query-keys";
import type { ProductListItem } from "@/types/product";
import { ProductListingClient } from "./product-listing-client";

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseFiltersFromParams(params);
  const queryClient = new QueryClient();

  // Prefetch first page of products server-side
  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.list(filters),
      queryFn: async () => {
        const filterParams: Record<string, string> = {};
        if (filters.categoryId) filterParams.categoryId = filters.categoryId;
        if (filters.categorySlug) filterParams.categorySlug = filters.categorySlug;
        if (filters.priceMin !== undefined) filterParams.priceMin = String(filters.priceMin);
        if (filters.priceMax !== undefined) filterParams.priceMax = String(filters.priceMax);
        if (filters.brand) filterParams.brand = filters.brand;
        if (filters.inStock) filterParams.inStock = "true";
        if (filters.sortBy) filterParams.sortBy = filters.sortBy;
        if (filters.limit) filterParams.limit = String(filters.limit);

        const result = await serverFetchPaginated<ProductListItem>("/products", filterParams);
        return {
          data: result.data.map((p) => parseDecimalFields(p, ["basePrice", "compareAtPrice"])),
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        };
      },
      initialPageParam: undefined as string | undefined,
    });
  } catch (error) {
    // Prefetch failure is non-fatal; client will refetch
    console.error("Products prefetch failed:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductListingClient />
    </HydrationBoundary>
  );
}
