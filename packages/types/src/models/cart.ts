export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  currency: string;
  couponCode?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
