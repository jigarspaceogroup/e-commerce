import { ReviewStatus } from "../enums";

export interface Wishlist {
  id: string;
  userId: string;
  productVariantId: string;
  notifyPriceDrop: boolean;
  notifyBackInStock: boolean;
  addedAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  rejectionReason: string | null;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewImage {
  id: string;
  reviewId: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
}

export interface ReviewHelpfulVote {
  id: string;
  reviewId: string;
  userId: string;
  createdAt: Date;
}
