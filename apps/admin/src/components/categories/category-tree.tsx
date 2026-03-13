"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { CategoryForm } from "./category-form";

interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

/* ── Tree Node ── */

function TreeNode({
  category,
  depth,
  onEdit,
  onCreateChild,
  onDelete,
}: {
  category: Category;
  depth: number;
  onEdit: (cat: Category) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-600 ${
            hasChildren ? "" : "invisible"
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Category info */}
        <div className="flex flex-1 items-center gap-2">
          <span className={`text-sm font-medium ${category.isActive ? "text-gray-900" : "text-gray-400"}`}>
            {category.nameEn}
          </span>
          <span className="text-xs text-gray-400">/{category.slug}</span>
          {!category.isActive && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">Inactive</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onCreateChild(category.id)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600"
            title="Add child"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDelete(category.id)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              title="Delete"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              depth={depth + 1}
              onEdit={onEdit}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ── */

export function CategoryTree() {
  const queryClient = useQueryClient();
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: async () => {
      const res = await apiClient.get<Category[]>("/admin/categories/tree");
      if (!res.success) throw new Error("Failed to load categories");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.del(`/admin/categories/${id}`);
      if (!res.success) throw new Error("Failed to delete category");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  function handleEdit(cat: Category) {
    setShowCreateForm(false);
    setCreateParentId(null);
    setEditCategory(cat);
  }

  function handleCreateChild(parentId: string) {
    setEditCategory(null);
    setCreateParentId(parentId);
    setShowCreateForm(true);
  }

  function handleCreateRoot() {
    setEditCategory(null);
    setCreateParentId(null);
    setShowCreateForm(true);
  }

  function handleFormClose() {
    setEditCategory(null);
    setCreateParentId(null);
    setShowCreateForm(false);
  }

  if (isLoading) {
    return <div className="animate-pulse py-4 text-sm text-gray-400">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          type="button"
          onClick={handleCreateRoot}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {/* Tree */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {categories && categories.length > 0 ? (
          <div className="divide-y divide-gray-100 py-2">
            {categories.map((cat) => (
              <TreeNode
                key={cat.id}
                category={cat}
                depth={0}
                onEdit={handleEdit}
                onCreateChild={handleCreateChild}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No categories yet. Create your first category!
          </div>
        )}
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editCategory) && (
        <CategoryForm
          mode={editCategory ? "edit" : "create"}
          category={editCategory ?? undefined}
          parentId={createParentId ?? undefined}
          categories={categories ?? []}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
