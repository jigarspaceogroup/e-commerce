"use client";

import { useState, type ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onSort?: (field: string, direction: "asc" | "desc") => void;
}

function SkeletonRows({ columns, count }: { columns: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data found.",
  rowKey,
  onSort,
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function handleSort(field: string) {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  }

  function getCellValue(row: T, accessor: keyof T | string): ReactNode {
    const keys = String(accessor).split(".");
    let value: unknown = row;
    for (const key of keys) {
      if (value == null) return "";
      value = (value as Record<string, unknown>)[key];
    }
    return value as ReactNode;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.accessor)}
                className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${
                  col.sortable ? "cursor-pointer select-none hover:text-gray-700" : ""
                } ${col.className ?? ""}`}
                onClick={col.sortable ? () => handleSort(String(col.accessor)) : undefined}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortField === String(col.accessor) && (
                    <svg
                      className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <SkeletonRows columns={columns.length} count={5} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={String(col.accessor)} className={`px-4 py-3 text-sm text-gray-900 ${col.className ?? ""}`}>
                    {col.render ? col.render(row) : getCellValue(row, col.accessor)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
