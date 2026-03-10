import { DiscountType, PromotionType } from "../enums";

export interface Promotion {
  id: string;
  nameEn: string;
  nameAr: string;
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  couponCode: string | null;
  minimumOrderAmount: number | null;
  maximumDiscountCap: number | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  priority: number;
  stackingAllowed: boolean;
  conditions: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionProduct {
  id: string;
  promotionId: string;
  productId: string;
}

export interface PromotionCategory {
  id: string;
  promotionId: string;
  categoryId: string;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  userId: string;
  orderId: string;
  discountApplied: number;
  createdAt: Date;
}
