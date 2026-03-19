"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface VariantAttribute {
  key: string;
  value: string;
}

interface Variant {
  id: string;
  sku: string;
  priceOverride?: number | null;
  stock: number;
  attributes: VariantAttribute[];
}

interface VariantManagerProps {
  productId: string;
}

function stockColor(stock: number): string {
  if (stock === 0) return "text-red-600 bg-red-50";
  if (stock < 10) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
}

export function VariantManager({ productId }: VariantManagerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("0");
  const [formAttrs, setFormAttrs] = useState<VariantAttribute[]>([{ key: "", value: "" }]);

  const { data: variants, isLoading } = useQuery({
    queryKey: [...queryKeys.products.detail(productId), "variants"],
    queryFn: async () => {
      const res = await apiClient.get<Variant[]>(`/admin/products/${productId}/variants`);
      if (!res.success) throw new Error("Failed to load variants");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { sku: string; priceOverride?: number; stock: number; attributes: VariantAttribute[] }) => {
      const res = await apiClient.post(`/admin/products/${productId}/variants`, body);
      if (!res.success) throw new Error(res.error?.message ?? "Failed to create variant");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Variant> }) => {
      const res = await apiClient.patch(`/admin/products/${productId}/variants/${id}`, body);
      if (!res.success) throw new Error(res.error?.message ?? "Failed to update variant");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.del(`/admin/products/${productId}/variants/${id}`);
      if (!res.success) throw new Error("Failed to delete variant");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
      setDeleteConfirmId(null);
    },
  });

  function resetForm() {
    setShowForm(false);
    setFormSku("");
    setFormPrice("");
    setFormStock("0");
    setFormAttrs([{ key: "", value: "" }]);
  }

  function startEdit(variant: Variant) {
    setEditingId(variant.id);
    setFormSku(variant.sku);
    setFormPrice(variant.priceOverride != null ? String(variant.priceOverride) : "");
    setFormStock(String(variant.stock));
    setFormAttrs(variant.attributes.length > 0 ? [...variant.attributes] : [{ key: "", value: "" }]);
  }

  function handleSave() {
    const attrs = formAttrs.filter((a) => a.key.trim() && a.value.trim());
    const body = {
      sku: formSku,
      priceOverride: formPrice ? Number(formPrice) : undefined,
      stock: Number(formStock),
      attributes: attrs,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function addAttrRow() {
    setFormAttrs([...formAttrs, { key: "", value: "" }]);
  }

  function updateAttr(index: number, field: "key" | "value", val: string) {
    const next = [...formAttrs];
    const row = next[index];
    if (row) {
      next[index] = { ...row, [field]: val };
      setFormAttrs(next);
    }
  }

  function removeAttr(index: number) {
    setFormAttrs(formAttrs.filter((_, i) => i !== index));
  }

  if (isLoading) {
    return <div className="animate-pulse py-4 text-sm text-gray-400">Loading variants...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Variants</h3>
        {!showForm && !editingId && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Variant
          </button>
        )}
      </div>

      {/* Variant Table */}
      {variants && variants.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Price Override</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Attributes</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{variant.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {variant.priceOverride != null ? `SAR ${Number(variant.priceOverride).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stockColor(variant.stock)}`}>
                      {variant.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {variant.attributes.map((a) => `${a.key}: ${a.value}`).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(variant)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      {deleteConfirmId === variant.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(variant.id)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(variant.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {variants?.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">No variants yet. Add a variant to get started.</p>
      )}

      {/* Add / Edit Form */}
      {(showForm || editingId) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-3 text-sm font-medium text-gray-900">
            {editingId ? "Edit Variant" : "New Variant"}
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">SKU</label>
                <input
                  type="text"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Price Override (SAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Stock</label>
                <input
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Attributes</label>
              {formAttrs.map((attr, idx) => (
                <div key={idx} className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={attr.key}
                    onChange={(e) => updateAttr(idx, "key", e.target.value)}
                    placeholder="Key (e.g., Color)"
                    className="w-1/3 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => updateAttr(idx, "value", e.target.value)}
                    placeholder="Value (e.g., Red)"
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {formAttrs.length > 1 && (
                    <button type="button" onClick={() => removeAttr(idx)} className="text-red-400 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAttrRow}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
              >
                + Add attribute
              </button>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
