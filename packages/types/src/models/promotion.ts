import { DiscountType, PromotionType } from '../enums';

export interface Promotion {
  id: string;
  code?: string;
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount: number;
  isActive: boolean;
  startsAt: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionProduct {
  id: string;
  promotionId: string;
  productId: string;
  createdAt: Date;
}

export interface PromotionCategory {
  id: string;
  promotionId: string;
  categoryId: string;
  createdAt: Date;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  createdAt: Date;
}
