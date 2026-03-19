"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput, StatusFilter, CategoryFilter } from "@/components/shared/filters";
import { Pagination } from "@/components/shared/pagination";

interface ProductImage {
  url: string;
  altEn?: string;
}

interface Product {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  status: string;
  basePrice: number;
  category?: { id: string; nameEn: string };
  images?: ProductImage[];
  _count?: { variants: number };
  totalStock?: number;
}

interface ProductListResponse {
  items: Product[];
  cursor?: string;
  hasMore: boolean;
}

interface CategoryOption {
  id: string;
  nameEn: string;
  children?: CategoryOption[];
}

const STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    ARCHIVED: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

export function ProductList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();

  const filters = { search, status, categoryId, cursor };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        limit: 20,
      };
      if (search) params.search = search;
      if (status) params.status = status;
      if (categoryId) params.categoryId = categoryId;
      if (cursor) params.cursor = cursor;
      const res = await apiClient.get<ProductListResponse>("/admin/products", params);
      if (!res.success) throw new Error(res.error?.message ?? "Failed to load products");
      return res.data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: async () => {
      const res = await apiClient.get<CategoryOption[]>("/admin/categories/tree");
      if (!res.success) throw new Error("Failed to load categories");
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const res = await apiClient.patch(`/admin/products/${id}`, { status: newStatus });
      if (!res.success) throw new Error("Failed to update status");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const handleLoadMore = useCallback(
    (c: string) => setCursor(c),
    [],
  );

  const columns: Column<Product>[] = [
    {
      header: "Image",
      accessor: "images",
      className: "w-16",
      render: (row) => {
        const img = row.images?.[0];
        return img ? (
          <img src={img.url} alt={img.altEn ?? row.titleEn} className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
            N/A
          </div>
        );
      },
    },
    {
      header: "Title",
      accessor: "titleEn",
      sortable: true,
      render: (row) => (
        <Link href={`/dashboard/products/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.titleEn}
        </Link>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      render: (row) => row.category?.nameEn ?? "-",
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => statusBadge(row.status),
    },
    {
      header: "Price",
      accessor: "basePrice",
      sortable: true,
      render: (row) => `SAR ${Number(row.basePrice).toFixed(2)}`,
    },
    {
      header: "Stock",
      accessor: "totalStock",
      render: (row) => {
        const stock = row.totalStock ?? 0;
        const color = stock === 0 ? "text-red-600" : stock < 10 ? "text-yellow-600" : "text-green-600";
        return <span className={`font-medium ${color}`}>{stock}</span>;
      },
    },
    {
      header: "Actions",
      accessor: "id",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => statusMutation.mutate({ id: row.id, newStatus: "ACTIVE" })}
              className="text-xs text-green-600 hover:underline"
            >
              Publish
            </button>
          )}
          {row.status === "ACTIVE" && (
            <button
              type="button"
              onClick={() => statusMutation.mutate({ id: row.id, newStatus: "ARCHIVED" })}
              className="text-xs text-yellow-600 hover:underline"
            >
              Archive
            </button>
          )}
          <Link href={`/dashboard/products/${row.id}`} className="text-xs text-blue-600 hover:underline">
            Edit
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
        </div>
        <StatusFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <CategoryFilter value={categoryId} onChange={setCategoryId} categories={categoriesData ?? []} />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No products found. Create your first product!"
        rowKey={(row) => row.id}
      />

      {/* Pagination */}
      <Pagination
        cursor={data?.cursor}
        hasMore={data?.hasMore ?? false}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
