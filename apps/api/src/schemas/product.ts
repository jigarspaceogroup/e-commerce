import { z } from "zod";

export const createProductSchema = z.object({
  titleEn: z.string().min(1).max(200),
  titleAr: z.string().min(1).max(200),
  descriptionEn: z.string().min(1),
  descriptionAr: z.string().min(1),
  basePrice: z.number().positive().or(z.string().transform(Number)).pipe(z.number().positive()),
  compareAtPrice: z.number().positive().optional().nullable(),
  brand: z.string().max(100).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  categoryId: z.string().uuid(),
  seoTitleEn: z.string().max(70).optional(),
  seoTitleAr: z.string().max(70).optional(),
  seoDescriptionEn: z.string().max(160).optional(),
  seoDescriptionAr: z.string().max(160).optional(),
  specifications: z.record(z.string(), z.object({ en: z.string(), ar: z.string() })).optional(),
  faq: z.array(z.object({
    question: z.object({ en: z.string(), ar: z.string() }),
    answer: z.object({ en: z.string(), ar: z.string() }),
  })).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParam = z.object({
  id: z.string().uuid(),
});

export const productListQuery = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "basePrice", "titleEn"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().uuid().optional(),
  limit: z.string().optional().default("20").transform(Number).pipe(z.number().int().min(1).max(100)),
});

export const publicProductListQuery = z.object({
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  priceMin: z.string().optional().transform((v) => v ? Number(v) : undefined),
  priceMax: z.string().optional().transform((v) => v ? Number(v) : undefined),
  brand: z.string().optional(),
  inStock: z.string().optional().transform((v) => v === "true"),
  sortBy: z.enum(["price_asc", "price_desc", "newest", "popularity"]).optional().default("newest"),
  cursor: z.string().uuid().optional(),
  limit: z.string().optional().default("20").transform(Number).pipe(z.number().int().min(1).max(100)),
});

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  priceOverride: z.number().positive().optional().nullable(),
  stockQuantity: z.number().int().min(0).optional().default(0),
  safetyStock: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().nullable(),
  backorderEnabled: z.boolean().optional().default(false),
  weightOverride: z.number().positive().optional().nullable(),
  attributes: z.record(z.string(), z.string()).optional().default({}),
});

export const updateVariantSchema = createVariantSchema.partial();

export const variantIdParam = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
});
