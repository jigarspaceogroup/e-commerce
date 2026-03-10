import {
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from "../enums";

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingFee: number;
  grandTotal: number;
  currency: string;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  couponCodeUsed: string | null;
  notes: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryDate: Date | null;
  slaDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productVariantId: string;
  productTitleSnapshot: string;
  variantAttributesSnapshot: Record<string, string> | null;
  skuSnapshot: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  status: OrderItemStatus;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  gatewayTransactionId: string | null;
  gatewayResponse: Record<string, unknown> | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  refundAmount: number;
  refundReasonCode: string | null;
  retryCount: number;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  orderId: string;
  orderItemId: string | null;
  amount: number;
  reasonCode: string;
  reasonNotes: string | null;
  status: RefundStatus;
  gatewayRefundId: string | null;
  processedBy: string | null;
  createdAt: Date;
  processedAt: Date | null;
}
