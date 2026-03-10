import { ProductStatus, VariantStatus } from "../enums";

export interface Product {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  compareAtPrice: number | null;
  brand: string | null;
  weight: number | null;
  dimensions: Record<string, number> | null;
  slug: string;
  status: ProductStatus;
  categoryId: string;
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  faq: Array<{ question: string; answer: string }> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  priceOverride: number | null;
  stockQuantity: number;
  safetyStock: number;
  lowStockThreshold: number | null;
  backorderEnabled: boolean;
  weightOverride: number | null;
  attributes: Record<string, string>;
  status: VariantStatus;
  seoSlugSuffix: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  altTextEn: string | null;
  altTextAr: string | null;
  sortOrder: number;
  createdAt: Date;
}

export interface Category {
  id: string;
  parentId: string | null;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  bannerImageUrl: string | null;
  sortOrder: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
