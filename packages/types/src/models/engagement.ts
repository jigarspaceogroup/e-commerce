import { ReviewStatus } from '../enums';

export interface Wishlist {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderItemId?: string;
  rating: number;
  titleAr?: string;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  adminNotes?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewImage {
  id: string;
  reviewId: string;
  url: string;
  altText?: string;
  sortOrder: number;
  createdAt: Date;
}

export interface ReviewHelpfulVote {
  id: string;
  reviewId: string;
  userId: string;
  isHelpful: boolean;
  createdAt: Date;
}
