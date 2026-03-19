"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput, StatusFilter } from "@/components/shared/filters";
import { Pagination } from "@/components/shared/pagination";

interface InventorySummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  stock: number;
  lowStockThreshold: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  categoryName?: string;
}

interface InventoryListResponse {
  items: InventoryItem[];
  cursor?: string;
  hasMore: boolean;
}

const STOCK_STATUS_OPTIONS = [
  { label: "In Stock", value: "in_stock" },
  { label: "Low Stock", value: "low_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
];

const ADJUSTMENT_REASONS = [
  { label: "Received", value: "received" },
  { label: "Sold", value: "sold" },
  { label: "Returned", value: "returned" },
  { label: "Damaged", value: "damaged" },
  { label: "Correction", value: "correction" },
  { label: "Other", value: "other" },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    in_stock: "bg-green-100 text-green-700",
    low_stock: "bg-yellow-100 text-yellow-700",
    out_of_stock: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function InventoryList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [adjustModal, setAdjustModal] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("correction");
  const [adjustNotes, setAdjustNotes] = useState("");

  const filters = { search, status: statusFilter, cursor };

  const { data: summary } = useQuery({
    queryKey: queryKeys.inventory.summary(),
    queryFn: async () => {
      const res = await apiClient.get<InventorySummary>("/admin/inventory/summary");
      if (!res.success) throw new Error("Failed to load summary");
      return res.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        limit: 20,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (cursor) params.cursor = cursor;
      const res = await apiClient.get<InventoryListResponse>("/admin/inventory", params);
      if (!res.success) throw new Error("Failed to load inventory");
      return res.data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ itemId, quantity, reason, notes }: { itemId: string; quantity: number; reason: string; notes: string }) => {
      const res = await apiClient.post(`/admin/inventory/${itemId}/adjust`, { quantity, reason, notes });
      if (!res.success) throw new Error(res.error?.message ?? "Failed to adjust stock");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      closeAdjustModal();
    },
  });

  function openAdjustModal(item: InventoryItem) {
    setAdjustModal(item);
    setAdjustQty("");
    setAdjustReason("correction");
    setAdjustNotes("");
  }

  function closeAdjustModal() {
    setAdjustModal(null);
    setAdjustQty("");
    setAdjustReason("correction");
    setAdjustNotes("");
  }

  function handleAdjust() {
    if (!adjustModal || !adjustQty) return;
    adjustMutation.mutate({
      itemId: adjustModal.id,
      quantity: Number(adjustQty),
      reason: adjustReason,
      notes: adjustNotes,
    });
  }

  const columns: Column<InventoryItem>[] = [
    {
      header: "SKU",
      accessor: "sku",
      sortable: true,
      render: (row) => <span className="font-mono text-sm">{row.sku}</span>,
    },
    {
      header: "Product",
      accessor: "productName",
      sortable: true,
    },
    {
      header: "Category",
      accessor: "categoryName",
      render: (row) => row.categoryName ?? "-",
    },
    {
      header: "Stock",
      accessor: "stock",
      sortable: true,
      render: (row) => {
        const color = row.stock === 0 ? "text-red-600" : row.stock <= row.lowStockThreshold ? "text-yellow-600" : "text-green-600";
        return <span className={`font-medium ${color}`}>{row.stock}</span>;
      },
    },
    {
      header: "Threshold",
      accessor: "lowStockThreshold",
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => statusBadge(row.status),
    },
    {
      header: "Actions",
      accessor: "id",
      render: (row) => (
        <button
          type="button"
          onClick={() => openAdjustModal(row)}
          className="text-sm text-blue-600 hover:underline"
        >
          Adjust Stock
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="Total SKUs" value={summary.total} color="text-gray-900" />
          <SummaryCard label="In Stock" value={summary.inStock} color="text-green-600" />
          <SummaryCard label="Low Stock" value={summary.lowStock} color="text-yellow-600" />
          <SummaryCard label="Out of Stock" value={summary.outOfStock} color="text-red-600" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by SKU or product..." />
        </div>
        <StatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STOCK_STATUS_OPTIONS}
          allLabel="All Stock Status"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No inventory items found."
        rowKey={(row) => row.id}
      />

      {/* Pagination */}
      <Pagination
        cursor={data?.cursor}
        hasMore={data?.hasMore ?? false}
        onLoadMore={(c) => setCursor(c)}
      />

      {/* Stock Adjustment Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Adjust Stock</h3>
            <p className="mb-4 text-sm text-gray-600">
              <span className="font-medium">{adjustModal.productName}</span>{" "}
              <span className="font-mono text-gray-400">({adjustModal.sku})</span>
              <br />
              Current stock: <span className="font-medium">{adjustModal.stock}</span>
            </p>

            {adjustMutation.isError && (
              <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
                {adjustMutation.error instanceof Error ? adjustMutation.error.message : "An error occurred"}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity (use negative to subtract)</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g., 10 or -5"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ADJUSTMENT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeAdjustModal}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjust}
                disabled={!adjustQty || adjustMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {adjustMutation.isPending ? "Adjusting..." : "Adjust Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
