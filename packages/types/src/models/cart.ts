// Matches Prisma Cart model
export interface Cart {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  couponCode?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingEstimate: number;
  grandTotal: number;
  itemCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemWithDetails[];
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

export interface CartItemWithDetails extends CartItem {
  variant: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    stockQuantity: number;
    effectivePrice: number;
  };
  product: {
    id: string;
    titleEn: string;
    titleAr: string;
    slug: string;
    image: { url: string; altTextEn: string } | null;
  };
}

export interface AddCartItemInput {
  productVariantId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}
