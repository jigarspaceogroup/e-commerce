// apps/storefront/src/types/product.ts

// ─── Category ────────────────────────────────────────────────────────────────

export interface CategoryTreeNode {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  bannerImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
  children: CategoryTreeNode[];
}

export interface CategoryDetail {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  bannerImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  materializedPath: string;
  _count: { products: number };
}

// ─── Product List Item ───────────────────────────────────────────────────────

export interface ProductListImage {
  id: string;
  url: string;
  altTextEn: string | null;
  altTextAr: string | null;
  sortOrder: number;
}

export interface ProductListVariant {
  id: string;
  priceOverride: number | null;
  stockQuantity: number;
  attributes: Record<string, string>;
}

export interface ProductListItem {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  basePrice: number;
  compareAtPrice: number | null;
  brand: string | null;
  status: string;
  category: { id: string; nameEn: string; nameAr: string; slug: string };
  variants: ProductListVariant[];
  images: ProductListImage[];
}

// ─── Product Detail ──────────────────────────────────────────────────────────

export interface ProductDetailCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  parent: {
    id: string;
    nameEn: string;
    nameAr: string;
    slug: string;
    parent: {
      id: string;
      nameEn: string;
      nameAr: string;
      slug: string;
    } | null;
  } | null;
}

export interface ProductDetailVariant {
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
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetailImage {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  altTextEn: string | null;
  altTextAr: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProductDetail {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  compareAtPrice: number | null;
  brand: string | null;
  weight: number | null;
  dimensions: { length?: number; width?: number; height?: number } | null;
  slug: string;
  status: string;
  categoryId: string;
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  specifications: Record<string, { en: string; ar: string }> | null;
  faq: Array<{ question: { en: string; ar: string }; answer: { en: string; ar: string } }> | null;
  createdAt: string;
  updatedAt: string;
  category: ProductDetailCategory;
  variants: ProductDetailVariant[];
  images: ProductDetailImage[];
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ProductListResponse {
  data: ProductListItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface CategorySlugResponse {
  redirect?: string;
}

export interface ProductSlugResponse {
  redirect?: string;
}

// ─── Filter State ────────────────────────────────────────────────────────────

export interface ProductFilters {
  categoryId?: string;
  categorySlug?: string;
  priceMin?: number;
  priceMax?: number;
  brand?: string;
  inStock?: boolean;
  sortBy?: "price_asc" | "price_desc" | "newest" | "popularity";
  cursor?: string;
  limit?: number;
}
