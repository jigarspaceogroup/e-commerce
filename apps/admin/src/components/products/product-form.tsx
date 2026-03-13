"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { ImageUploader } from "@/components/products/image-uploader";
import { VariantManager } from "@/components/products/variant-manager";

/* ── Schema ── */

const productSchema = z.object({
  titleEn: z.string().min(1, "English title is required"),
  titleAr: z.string().min(1, "Arabic title is required"),
  slug: z.string().min(1, "Slug is required"),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  basePrice: z.number().min(0, "Price must be >= 0"),
  compareAtPrice: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  dimensionL: z.number().min(0).optional(),
  dimensionW: z.number().min(0).optional(),
  dimensionH: z.number().min(0).optional(),
  seoTitleEn: z.string().optional(),
  seoTitleAr: z.string().optional(),
  seoDescriptionEn: z.string().optional(),
  seoDescriptionAr: z.string().optional(),
  specifications: z.array(z.object({ key: z.string(), value: z.string() })),
  faqs: z.array(
    z.object({
      questionEn: z.string(),
      questionAr: z.string(),
      answerEn: z.string(),
      answerAr: z.string(),
    }),
  ),
});

type ProductFormValues = z.infer<typeof productSchema>;

/* ── Types ── */

interface CategoryOption {
  id: string;
  nameEn: string;
  children?: CategoryOption[];
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: Partial<ProductFormValues> & { id?: string };
}

/* ── Tabs ── */

const TABS = [
  { key: "basic", label: "Basic Info" },
  { key: "description", label: "Description" },
  { key: "pricing", label: "Pricing" },
  { key: "images", label: "Images" },
  { key: "variants", label: "Variants" },
  { key: "seo", label: "SEO" },
  { key: "specs", label: "Specifications" },
  { key: "faq", label: "FAQ" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ── Helpers ── */

function flattenCategories(
  categories: CategoryOption[],
  depth = 0,
): { id: string; nameEn: string; depth: number }[] {
  const result: { id: string; nameEn: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, nameEn: cat.nameEn, depth });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

/* ── Component ── */

export function ProductForm({ mode, productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      titleEn: "",
      titleAr: "",
      slug: "",
      categoryId: "",
      brand: "",
      descriptionEn: "",
      descriptionAr: "",
      basePrice: 0,
      compareAtPrice: undefined,
      weight: undefined,
      dimensionL: undefined,
      dimensionW: undefined,
      dimensionH: undefined,
      seoTitleEn: "",
      seoTitleAr: "",
      seoDescriptionEn: "",
      seoDescriptionAr: "",
      specifications: [],
      faqs: [],
      ...initialData,
    },
  });

  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec,
  } = useFieldArray({ control, name: "specifications" });

  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray({ control, name: "faqs" });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: async () => {
      const res = await apiClient.get<CategoryOption[]>("/admin/categories/tree");
      if (!res.success) throw new Error("Failed to load categories");
      return res.data;
    },
  });

  const flatCats = categoriesData ? flattenCategories(categoriesData) : [];

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (mode === "create") {
        const res = await apiClient.post<{ id: string }>("/admin/products", values);
        if (!res.success) throw new Error(res.error?.message ?? "Failed to create product");
        return res.data;
      }
      const res = await apiClient.patch(`/admin/products/${productId}`, values);
      if (!res.success) throw new Error(res.error?.message ?? "Failed to update product");
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      if (mode === "create" && data && typeof data === "object" && "id" in data) {
        router.push(`/dashboard/products/${(data as { id: string }).id}`);
      }
    },
  });

  const onSubmit = handleSubmit((values: ProductFormValues) => saveMutation.mutateAsync(values));

  const descEn = watch("descriptionEn") ?? "";
  const descAr = watch("descriptionAr") ?? "";

  /* ── Label helper ── */

  function fieldLabel(label: string, error?: string) {
    return (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {error && <span className="ml-1 text-red-500">({error})</span>}
      </label>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "create" ? "New Product" : "Edit Product"}
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/products")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </div>

      {saveMutation.isError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {saveMutation.error instanceof Error ? saveMutation.error.message : "An error occurred"}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <form onSubmit={onSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
        {/* Basic Info */}
        {activeTab === "basic" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {fieldLabel("Title (English)", errors.titleEn?.message)}
                <input
                  {...register("titleEn")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                {fieldLabel("Title (Arabic)", errors.titleAr?.message)}
                <input
                  {...register("titleAr")}
                  dir="rtl"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {fieldLabel("Slug", errors.slug?.message)}
                <input
                  {...register("slug")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                {fieldLabel("Brand")}
                <input
                  {...register("brand")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              {fieldLabel("Category")}
              <select
                {...register("categoryId")}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No category</option>
                {flatCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"\u00A0\u00A0".repeat(cat.depth)}{cat.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Description */}
        {activeTab === "description" && (
          <div className="space-y-4">
            <div>
              {fieldLabel("Description (English)")}
              <div className="mt-1">
                <RichTextEditor
                  value={descEn}
                  onChange={(html) => setValue("descriptionEn", html)}
                />
              </div>
            </div>
            <div>
              {fieldLabel("Description (Arabic)")}
              <div className="mt-1" dir="rtl">
                <RichTextEditor
                  value={descAr}
                  onChange={(html) => setValue("descriptionAr", html)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pricing */}
        {activeTab === "pricing" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {fieldLabel("Base Price (SAR)", errors.basePrice?.message)}
                <input
                  type="number"
                  step="0.01"
                  {...register("basePrice", { valueAsNumber: true })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                {fieldLabel("Compare At Price (SAR)")}
                <input
                  type="number"
                  step="0.01"
                  {...register("compareAtPrice", { valueAsNumber: true })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              {fieldLabel("Weight (kg)")}
              <input
                type="number"
                step="0.01"
                {...register("weight", { valueAsNumber: true })}
                className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              {fieldLabel("Dimensions (cm)")}
              <div className="mt-1 flex gap-3">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Length"
                  {...register("dimensionL", { valueAsNumber: true })}
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Width"
                  {...register("dimensionW", { valueAsNumber: true })}
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Height"
                  {...register("dimensionH", { valueAsNumber: true })}
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === "images" && (
          <div>
            {productId ? (
              <ImageUploader productId={productId} />
            ) : (
              <p className="text-sm text-gray-500">
                Save the product first to upload images.
              </p>
            )}
          </div>
        )}

        {/* Variants Tab */}
        {activeTab === "variants" && (
          <div>
            {productId ? (
              <VariantManager productId={productId} />
            ) : (
              <p className="text-sm text-gray-500">
                Save the product first to manage variants.
              </p>
            )}
          </div>
        )}

        {/* SEO */}
        {activeTab === "seo" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {fieldLabel("SEO Title (English)")}
                <input
                  {...register("seoTitleEn")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                {fieldLabel("SEO Title (Arabic)")}
                <input
                  {...register("seoTitleAr")}
                  dir="rtl"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {fieldLabel("SEO Description (English)")}
                <textarea
                  {...register("seoDescriptionEn")}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                {fieldLabel("SEO Description (Arabic)")}
                <textarea
                  {...register("seoDescriptionAr")}
                  rows={3}
                  dir="rtl"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Specifications */}
        {activeTab === "specs" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Add key-value specification pairs for this product.</p>
            {specFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3">
                <input
                  {...register(`specifications.${index}.key`)}
                  placeholder="Key"
                  className="w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  {...register(`specifications.${index}.value`)}
                  placeholder="Value"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeSpec(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendSpec({ key: "", value: "" })}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Specification
            </button>
          </div>
        )}

        {/* FAQ */}
        {activeTab === "faq" && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">Add frequently asked questions about this product.</p>
            {faqFields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">FAQ #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    {fieldLabel("Question (English)")}
                    <input
                      {...register(`faqs.${index}.questionEn`)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    {fieldLabel("Question (Arabic)")}
                    <input
                      {...register(`faqs.${index}.questionAr`)}
                      dir="rtl"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    {fieldLabel("Answer (English)")}
                    <textarea
                      {...register(`faqs.${index}.answerEn`)}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    {fieldLabel("Answer (Arabic)")}
                    <textarea
                      {...register(`faqs.${index}.answerAr`)}
                      rows={2}
                      dir="rtl"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                appendFaq({ questionEn: "", questionAr: "", answerEn: "", answerAr: "" })
              }
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add FAQ
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
