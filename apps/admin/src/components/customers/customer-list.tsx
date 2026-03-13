"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/filters";
import { Pagination } from "@/components/shared/pagination";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  ordersCount: number;
  createdAt: string;
}

interface CustomerListResponse {
  items: Customer[];
  cursor?: string;
  hasMore: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CustomerList() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();

  const filters = { search, dateFrom, dateTo, cursor };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        limit: 20,
      };
      if (search) params.search = search;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (cursor) params.cursor = cursor;
      const res = await apiClient.get<CustomerListResponse>("/admin/customers", params);
      if (!res.success) throw new Error("Failed to load customers");
      return res.data;
    },
  });

  const columns: Column<Customer>[] = [
    {
      header: "Name",
      accessor: "firstName",
      sortable: true,
      render: (row) => (
        <Link
          href={`/dashboard/customers/${row.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.firstName} {row.lastName}
        </Link>
      ),
    },
    {
      header: "Email",
      accessor: "email",
    },
    {
      header: "Phone",
      accessor: "phone",
      render: (row) => row.phone ?? "-",
    },
    {
      header: "Orders",
      accessor: "ordersCount",
      sortable: true,
      render: (row) => (
        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {row.ordersCount}
        </span>
      ),
    },
    {
      header: "Joined",
      accessor: "createdAt",
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
    {
      header: "",
      accessor: "id",
      render: (row) => (
        <Link
          href={`/dashboard/customers/${row.id}`}
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No customers found."
        rowKey={(row) => row.id}
      />

      {/* Pagination */}
      <Pagination
        cursor={data?.cursor}
        hasMore={data?.hasMore ?? false}
        onLoadMore={(c) => setCursor(c)}
      />
    </div>
  );
}
