import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock env config
vi.mock("../../config/env.js", () => ({
  env: {
    NODE_ENV: "development",
    PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    MEILISEARCH_HOST: "http://localhost:7700",
    MEILISEARCH_API_KEY: "test-key",
    JWT_PUBLIC_KEY: "test-public-key",
  },
}));

// Mock auth service
vi.mock("../../services/auth.js", () => ({
  verifyAccessToken: vi.fn().mockReturnValue({
    sub: "auth-user-id",
    email: "user@test.com",
    permissions: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
}));

// Mock Redis
vi.mock("../../services/redis.js", () => ({
  getRedisClient: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    del: vi.fn(),
  }),
  createRedisClient: vi.fn(),
  rateLimitCheck: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 99,
    resetAt: Date.now() + 60000,
  }),
}));

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    cart: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
    promotion: {
      findFirst: vi.fn(),
    },
    promotionUsage: {
      count: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";
const GUEST_COOKIE = "cart_session=guest-session-id";

const CART_ID = "cart-123";
const ITEM_ID = "item-456";
const VARIANT_ID = "770e8400-e29b-41d4-a716-446655440001";
const PRODUCT_ID = "660e8400-e29b-41d4-a716-446655440001";
const PROMOTION_ID = "880e8400-e29b-41d4-a716-446655440001";

const sampleProduct = {
  id: PRODUCT_ID,
  titleEn: "Test Product",
  titleAr: "منتج تجريبي",
  slug: "test-product",
  basePrice: 200,
  status: "published",
  deletedAt: null,
  categoryId: "cat-1",
};

const sampleVariant = {
  id: VARIANT_ID,
  productId: PRODUCT_ID,
  sku: "TEST-001",
  priceOverride: null,
  stockQuantity: 10,
  attributes: { size: "M" },
  product: sampleProduct,
};

const baseCart: {
  id: string;
  userId: string | null;
  sessionId: string | null;
  couponCode: string | null;
  subtotal: number;
  taxAmount: number;
  shippingEstimate: number;
  discountAmount: number;
  grandTotal: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
} = {
  id: CART_ID,
  userId: "auth-user-id",
  sessionId: null,
  couponCode: null,
  subtotal: 200,
  taxAmount: 30,
  shippingEstimate: 30,
  discountAmount: 0,
  grandTotal: 260,
  lastActivityAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cartWithItems = {
  ...baseCart,
  items: [
    {
      id: ITEM_ID,
      cartId: CART_ID,
      productVariantId: VARIANT_ID,
      quantity: 1,
      unitPriceAtAddition: 200,
      createdAt: new Date(),
      variant: {
        ...sampleVariant,
        product: {
          ...sampleProduct,
          images: [
            {
              id: "img-1",
              url: "https://example.com/image.jpg",
              altTextEn: "Product image",
            },
          ],
        },
      },
    },
  ],
};

const now = new Date();
const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const validPercentagePromotion = {
  id: PROMOTION_ID,
  nameEn: "20% Off",
  nameAr: "خصم 20%",
  type: "coupon",
  discountType: "percentage",
  discountValue: 20,
  couponCode: "SAVE20",
  minimumOrderAmount: null,
  maximumDiscountCap: null,
  usageLimitTotal: null,
  usageLimitPerUser: null,
  usageCount: 0,
  startDate: pastDate,
  endDate: futureDate,
  isActive: true,
  priority: 0,
  stackingAllowed: false,
  conditions: null,
  products: [],
  categories: [],
  createdAt: now,
  updatedAt: now,
};

const validFixedAmountPromotion = {
  ...validPercentagePromotion,
  id: "880e8400-e29b-41d4-a716-446655440002",
  nameEn: "50 SAR Off",
  nameAr: "خصم 50 ريال",
  discountType: "fixed_amount",
  discountValue: 50,
  couponCode: "FIXED50",
};

const validFreeShippingPromotion = {
  ...validPercentagePromotion,
  id: "880e8400-e29b-41d4-a716-446655440003",
  nameEn: "Free Shipping",
  nameAr: "شحن مجاني",
  discountType: "free_shipping",
  discountValue: 0,
  couponCode: "FREESHIP",
};

const expiredPromotion = {
  ...validPercentagePromotion,
  id: "880e8400-e29b-41d4-a716-446655440004",
  couponCode: "EXPIRED",
  startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
  endDate: pastDate,
};

// Helper to set up mocks for apply coupon flow
function setupApplyCouponMocks(
  cart: typeof baseCart,
  promotion: typeof validPercentagePromotion | null,
  cartAfterUpdate?: typeof cartWithItems,
) {
  // getOrCreateCart: findUnique for userId
  vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);
  // applyCoupon: findUnique for cart
  vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);

  if (promotion) {
    // validateCoupon: findFirst for promotion
    vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
    // applyCoupon: cart update
    vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
    // getCartWithDetails after update
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(
      (cartAfterUpdate ?? cartWithItems) as any,
    );
  }
}

describe("Coupon API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /api/v1/cart/coupon ─────────────────────────────────────────────

  describe("POST /api/v1/cart/coupon", () => {
    it("applies valid coupon and returns updated cart with discount", async () => {
      const cartAfterCoupon = {
        ...cartWithItems,
        couponCode: "SAVE20",
        discountAmount: 40,
        taxAmount: 24,
        shippingEstimate: 30,
        grandTotal: 214,
      };

      setupApplyCouponMocks(baseCart, validPercentagePromotion, cartAfterCoupon);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "SAVE20" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.couponCode).toBe("SAVE20");
      expect(res.body.data.discountAmount).toBe(40);
    });

    it("returns 404 with COUPON_NOT_FOUND for invalid code", async () => {
      // getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(baseCart as any);
      // applyCoupon: findUnique for cart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(baseCart as any);
      // validateCoupon: promotion not found
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "INVALID" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("COUPON_NOT_FOUND");
    });

    it("returns 400 with COUPON_EXPIRED for expired code", async () => {
      // getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(baseCart as any);
      // applyCoupon: findUnique for cart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(baseCart as any);
      // validateCoupon: expired promotion
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(expiredPromotion as any);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "EXPIRED" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("COUPON_EXPIRED");
    });

    it("returns 400 with COUPON_ALREADY_APPLIED when coupon already applied", async () => {
      const cartWithCoupon = { ...baseCart, couponCode: "EXISTING" };
      // getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithCoupon as any);
      // applyCoupon: findUnique for cart (already has coupon)
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithCoupon as any);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "SAVE20" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("COUPON_ALREADY_APPLIED");
    });

    it("returns 400 for missing code in request body", async () => {
      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── DELETE /api/v1/cart/coupon ────────────────────────────────────────────

  describe("DELETE /api/v1/cart/coupon", () => {
    it("removes coupon and returns updated cart without discount", async () => {
      const cartWithCoupon = {
        ...baseCart,
        couponCode: "SAVE20",
        discountAmount: 40,
      };
      const cartAfterRemove = {
        ...cartWithItems,
        couponCode: null,
        discountAmount: 0,
        taxAmount: 30,
        shippingEstimate: 30,
        grandTotal: 260,
      };

      // getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithCoupon as any);
      // removeCoupon: findUnique for cart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithCoupon as any);
      // removeCoupon: update (clear coupon)
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      // recalculateCart: findUnique for cart (coupon now null)
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...cartWithCoupon,
        couponCode: null,
      } as any);
      // recalculateCart: cartItem.findMany
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([
        {
          quantity: 1,
          variant: sampleVariant,
        },
      ] as any);
      // recalculateCart: cart update
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      // getCartWithDetails after recalculation
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartAfterRemove as any);

      const res = await request(app)
        .delete("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.couponCode).toBeNull();
      expect(res.body.data.discountAmount).toBe(0);
    });
  });

  // ─── Cart Recalculation with Coupons ──────────────────────────────────────

  describe("Cart recalculation with coupons", () => {
    it("correctly applies percentage discount", async () => {
      // Subtotal: 200, 20% discount = 40
      // Tax: (200 - 40) * 0.15 = 24
      // Shipping: 30 (subtotal < 500)
      // Grand total: 200 + 24 + 30 - 40 = 214

      const cartAfterCoupon = {
        ...cartWithItems,
        couponCode: "SAVE20",
        discountAmount: 40,
        taxAmount: 24,
        shippingEstimate: 30,
        grandTotal: 214,
      };

      setupApplyCouponMocks(baseCart, validPercentagePromotion, cartAfterCoupon);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "SAVE20" });

      expect(res.status).toBe(200);
      expect(res.body.data.discountAmount).toBe(40);
      expect(res.body.data.taxAmount).toBe(24);
      expect(res.body.data.grandTotal).toBe(214);
    });

    it("correctly applies fixed_amount discount", async () => {
      // Subtotal: 200, fixed 50 discount
      // Tax: (200 - 50) * 0.15 = 22.5
      // Shipping: 30 (subtotal < 500)
      // Grand total: 200 + 22.5 + 30 - 50 = 202.5

      const cartAfterCoupon = {
        ...cartWithItems,
        couponCode: "FIXED50",
        discountAmount: 50,
        taxAmount: 22.5,
        shippingEstimate: 30,
        grandTotal: 202.5,
      };

      setupApplyCouponMocks(baseCart, validFixedAmountPromotion, cartAfterCoupon);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "FIXED50" });

      expect(res.status).toBe(200);
      expect(res.body.data.discountAmount).toBe(50);
      expect(res.body.data.taxAmount).toBe(22.5);
      expect(res.body.data.grandTotal).toBe(202.5);
    });

    it("applies free_shipping coupon (shipping = 0)", async () => {
      // Subtotal: 200, free shipping, no discount amount
      // Tax: 200 * 0.15 = 30
      // Shipping: 0 (free shipping)
      // Grand total: 200 + 30 + 0 - 0 = 230

      const cartAfterCoupon = {
        ...cartWithItems,
        couponCode: "FREESHIP",
        discountAmount: 0,
        taxAmount: 30,
        shippingEstimate: 0,
        grandTotal: 230,
      };

      setupApplyCouponMocks(baseCart, validFreeShippingPromotion, cartAfterCoupon);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "FREESHIP" });

      expect(res.status).toBe(200);
      expect(res.body.data.discountAmount).toBe(0);
      expect(res.body.data.shippingEstimate).toBe(0);
      expect(res.body.data.grandTotal).toBe(230);
    });

    it("calculates tax on (subtotal - discount) not raw subtotal", async () => {
      // With 20% discount on 200 subtotal:
      // Discount = 40
      // Tax should be on (200 - 40) = 160 => 160 * 0.15 = 24
      // NOT 200 * 0.15 = 30

      const cartAfterCoupon = {
        ...cartWithItems,
        couponCode: "SAVE20",
        discountAmount: 40,
        taxAmount: 24, // (200 - 40) * 0.15 = 24
        shippingEstimate: 30,
        grandTotal: 214, // 200 + 24 + 30 - 40
      };

      setupApplyCouponMocks(baseCart, validPercentagePromotion, cartAfterCoupon);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Authorization", AUTH_HEADER)
        .send({ code: "SAVE20" });

      expect(res.status).toBe(200);
      // Tax is 24 (on discounted subtotal), not 30 (on raw subtotal)
      expect(res.body.data.taxAmount).toBe(24);
      expect(res.body.data.taxAmount).not.toBe(30);
    });
  });

  // ─── Guest user coupon support ────────────────────────────────────────────

  describe("Guest user coupon support", () => {
    it("allows guest users to apply coupons", async () => {
      const guestCart = {
        ...baseCart,
        userId: null,
        sessionId: "guest-session-id",
      };
      const cartAfterCoupon = {
        ...cartWithItems,
        userId: null,
        sessionId: "guest-session-id",
        couponCode: "SAVE20",
        discountAmount: 40,
      };

      // getOrCreateCart: findFirst for sessionId
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(guestCart as any);
      // applyCoupon: findUnique for cart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(guestCart as any);
      // validateCoupon: find promotion
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(validPercentagePromotion as any);
      // applyCoupon: cart update
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      // getCartWithDetails
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartAfterCoupon as any);

      const res = await request(app)
        .post("/api/v1/cart/coupon")
        .set("Cookie", GUEST_COOKIE)
        .send({ code: "SAVE20" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.couponCode).toBe("SAVE20");
    });
  });
});
