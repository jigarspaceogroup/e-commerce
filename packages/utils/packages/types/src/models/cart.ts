export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string | null;
  couponCode: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingEstimate: number;
  grandTotal: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productVariantId: string;
  quantity: number;
  unitPriceAtAddition: number;
  createdAt: Date;
  updatedAt: Date;
}
