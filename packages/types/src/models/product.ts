import { ProductStatus, VariantStatus } from '../enums';

export interface Product {
  id: string;
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  basePrice: number;
  salePrice?: number;
  currency: string;
  categoryId?: string;
  brandId?: string;
  status: ProductStatus;
  isFeatured: boolean;
  weight?: number;
  weightUnit?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  nameAr?: string;
  nameEn?: string;
  price: number;
  salePrice?: number;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  status: VariantStatus;
  attributes: Record<string, string>;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId?: string;
  url: string;
  altTextAr?: string;
  altTextEn?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  parentId?: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
