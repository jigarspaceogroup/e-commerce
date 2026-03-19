"use client";

import { useEffect, useState, useRef } from "react";

/* ── SearchInput ── */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounceMs);
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

/* ── StatusFilter ── */

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  allLabel?: string;
}

export function StatusFilter({
  value,
  onChange,
  options,
  allLabel = "All Statuses",
}: StatusFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ── CategoryFilter ── */

interface CategoryOption {
  id: string;
  nameEn: string;
  children?: CategoryOption[];
}

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
  categories: CategoryOption[];
}

function renderCategoryOptions(
  categories: CategoryOption[],
  depth = 0,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (const cat of categories) {
    const prefix = "\u00A0\u00A0".repeat(depth);
    nodes.push(
      <option key={cat.id} value={cat.id}>
        {prefix}{cat.nameEn}
      </option>,
    );
    if (cat.children && cat.children.length > 0) {
      nodes.push(...renderCategoryOptions(cat.children, depth + 1));
    }
  }
  return nodes;
}

export function CategoryFilter({ value, onChange, categories }: CategoryFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">All Categories</option>
      {renderCategoryOptions(categories)}
    </select>
  );
}
