"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const categorySchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameAr: z.string().min(1, "Arabic name is required"),
  slug: z.string().min(1, "Slug is required"),
  parentId: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  seoTitleEn: z.string().optional(),
  seoTitleAr: z.string().optional(),
  seoDescriptionEn: z.string().optional(),
  seoDescriptionAr: z.string().optional(),
  bannerImage: z.string().optional(),
  sortOrder: z.number().min(0).optional(),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryOption {
  id: string;
  nameEn: string;
  children?: CategoryOption[];
}

interface CategoryFormProps {
  mode: "create" | "edit";
  category?: { id: string; nameEn: string; nameAr: string; slug: string; isActive: boolean; sortOrder: number } & Partial<CategoryFormValues>;
  parentId?: string;
  categories: CategoryOption[];
  onClose: () => void;
}

function flattenCategories(
  cats: CategoryOption[],
  depth = 0,
  excludeId?: string,
): { id: string; nameEn: string; depth: number }[] {
  const result: { id: string; nameEn: string; depth: number }[] = [];
  for (const cat of cats) {
    if (cat.id !== excludeId) {
      result.push({ id: cat.id, nameEn: cat.nameEn, depth });
      if (cat.children?.length) {
        result.push(...flattenCategories(cat.children, depth + 1, excludeId));
      }
    }
  }
  return result;
}

export function CategoryForm({ mode, category, parentId, categories, onClose }: CategoryFormProps) {
  const queryClient = useQueryClient();
  const flatCats = flattenCategories(categories, 0, category?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameEn: category?.nameEn ?? "",
      nameAr: category?.nameAr ?? "",
      slug: category?.slug ?? "",
      parentId: parentId ?? category?.parentId ?? "",
      descriptionEn: category?.descriptionEn ?? "",
      descriptionAr: category?.descriptionAr ?? "",
      seoTitleEn: category?.seoTitleEn ?? "",
      seoTitleAr: category?.seoTitleAr ?? "",
      seoDescriptionEn: category?.seoDescriptionEn ?? "",
      seoDescriptionAr: category?.seoDescriptionAr ?? "",
      bannerImage: category?.bannerImage ?? "",
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const body = { ...values, parentId: values.parentId || null };
      if (mode === "create") {
        const res = await apiClient.post("/admin/categories", body);
        if (!res.success) throw new Error(res.error?.message ?? "Failed to create category");
        return res.data;
      }
      const res = await apiClient.patch(`/admin/categories/${category!.id}`, body);
      if (!res.success) throw new Error(res.error?.message ?? "Failed to update category");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      onClose();
    },
  });

  const onSubmit = handleSubmit((values: CategoryFormValues) => saveMutation.mutateAsync(values));

  return (
    <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {mode === "create" ? "New Category" : `Edit: ${category?.nameEn}`}
        </h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {saveMutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {saveMutation.error instanceof Error ? saveMutation.error.message : "An error occurred"}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name (English) {errors.nameEn && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register("nameEn")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name (Arabic) {errors.nameAr && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register("nameAr")}
              dir="rtl"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Slug {errors.slug && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register("slug")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Parent Category</label>
            <select
              {...register("parentId")}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None (Root)</option>
              {flatCats.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"\u00A0\u00A0".repeat(cat.depth)}{cat.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Description (English)</label>
            <textarea
              {...register("descriptionEn")}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Arabic)</label>
            <textarea
              {...register("descriptionAr")}
              rows={2}
              dir="rtl"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* SEO fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">SEO Title (English)</label>
            <input
              {...register("seoTitleEn")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SEO Title (Arabic)</label>
            <input
              {...register("seoTitleAr")}
              dir="rtl"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">SEO Description (English)</label>
            <textarea
              {...register("seoDescriptionEn")}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SEO Description (Arabic)</label>
            <textarea
              {...register("seoDescriptionAr")}
              rows={2}
              dir="rtl"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Banner Image URL</label>
            <input
              {...register("bannerImage")}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sort Order</label>
            <input
              type="number"
              {...register("sortOrder", { valueAsNumber: true })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                {...register("isActive")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : mode === "create" ? "Create Category" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
