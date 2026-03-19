import { z } from "zod";

export const createCategorySchema = z.object({
  nameEn: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format").optional(),
  parentId: z.string().uuid().optional().nullable(),
  descriptionEn: z.string().max(500).optional(),
  descriptionAr: z.string().max(500).optional(),
  seoTitleEn: z.string().max(70).optional(),
  seoTitleAr: z.string().max(70).optional(),
  seoDescriptionEn: z.string().max(160).optional(),
  seoDescriptionAr: z.string().max(160).optional(),
  bannerImageUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParam = z.object({
  id: z.string().uuid(),
});

export const categoryListQuery = z.object({
  format: z.enum(["flat", "tree"]).optional().default("flat"),
  includeInactive: z.string().optional().transform((v) => v === "true"),
});
