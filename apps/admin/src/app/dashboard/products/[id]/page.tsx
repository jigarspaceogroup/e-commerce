"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ProductForm } from "@/components/products/product-form";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<Record<string, unknown>>(`/admin/products/${id}`);
      if (!res.success) throw new Error("Failed to load product");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Failed to load product. Please try again.
      </div>
    );
  }

  return (
    <ProductForm
      mode="edit"
      productId={id}
      initialData={data as Partial<Record<string, unknown>> & { id?: string }}
    />
  );
}
