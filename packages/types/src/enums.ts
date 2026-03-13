// ─── User Enums ──────────────────────────────────────────────────────────────

export enum PreferredLanguage {
  AR = 'ar',
  EN = 'en',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

// ─── Product Enums ───────────────────────────────────────────────────────────

export enum ProductStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum VariantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// ─── Order Enums ─────────────────────────────────────────────────────────────

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PROCESSING = 'processing',
  ON_HOLD = 'on_hold',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum OrderItemStatus {
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
  EXCHANGED = 'exchanged',
}

// ─── Payment Enums ───────────────────────────────────────────────────────────

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  MADA = 'mada',
  APPLE_PAY = 'apple_pay',
  STC_PAY = 'stc_pay',
  TABBY = 'tabby',
  TAMARA = 'tamara',
  PAYPAL = 'paypal',
  STORE_CREDIT = 'store_credit',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  VOIDED = 'voided',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

// ─── Review Enums ────────────────────────────────────────────────────────────

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ─── Promotion Enums ─────────────────────────────────────────────────────────

export enum PromotionType {
  COUPON = 'coupon',
  AUTOMATIC = 'automatic',
  BOGO = 'bogo',
  TIER_PRICING = 'tier_pricing',
  BUNDLE = 'bundle',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SHIPPING = 'free_shipping',
}

// ─── Notification Enums ──────────────────────────────────────────────────────

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
}

export enum NotificationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  OPENED = 'opened',
}

// ─── CMS Enums ───────────────────────────────────────────────────────────────

export enum CMSContentType {
  PAGE = 'page',
  BANNER = 'banner',
  HOMEPAGE_SECTION = 'homepage_section',
  PRODUCT_TEMPLATE = 'product_template',
}

export enum CMSContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

// ─── Inventory Enums ─────────────────────────────────────────────────────────

export enum MovementType {
  SALE = 'sale',
  CANCELLATION = 'cancellation',
  RETURN = 'return',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  CYCLE_COUNT = 'cycle_count',
  BACKORDER_FULFILLMENT = 'backorder_fulfillment',
}

export enum ReferenceType {
  ORDER = 'order',
  RETURN_REQUEST = 'return_request',
  MANUAL = 'manual',
}

// ─── Support Enums ───────────────────────────────────────────────────────────

export enum TicketCategory {
  ORDER_ISSUE = 'order_issue',
  PAYMENT_ISSUE = 'payment_issue',
  PRODUCT_QUESTION = 'product_question',
  ACCOUNT_ISSUE = 'account_issue',
  RETURNS = 'returns',
  OTHER = 'other',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  AWAITING_CUSTOMER = 'awaiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
}
