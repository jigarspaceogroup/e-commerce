import {
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '../enums';

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  shippingAddressId: string;
  billingAddressId?: string;
  promotionId?: string;
  couponCode?: string;
  notes?: string;
  cancelledAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  status: OrderItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: RefundStatus;
  gatewayRefundId?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
