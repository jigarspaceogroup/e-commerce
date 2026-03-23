import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Decimal } from "@prisma/client/runtime/client";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    promotion: {
      findFirst: vi.fn(),
    },
    promotionUsage: {
      count: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cartItem: {
      findMany: vi.fn(),
    },
  },
}));

// Mock error handlers
vi.mock("../../middleware/error-handler.js", () => {
  class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, code: string, isOperational = true) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.isOperational = isOperational;
      Object.setPrototypeOf(this, AppError.prototype);
    }
  }

  return {
    AppError,
    badRequest: (msg: string) => new AppError(msg, 400, "BAD_REQUEST"),
    notFound: (msg: string) => new AppError(msg, 404, "RESOURCE_NOT_FOUND"),
    unauthorized: (msg: string) => new AppError(msg, 401, "UNAUTHORIZED"),
  };
});

// Mock cart service functions used by coupon service
vi.mock("../../services/cart.js", () => ({
  recalculateCart: vi.fn(),
  getCartWithDetails: vi.fn(),
  formatCartResponse: vi.fn((cart: any) => ({
    id: cart.id,
    items: [],
    subtotal: Number(cart.subtotal ?? 0),
    taxAmount: Number(cart.taxAmount ?? 0),
    shippingEstimate: Number(cart.shippingEstimate ?? 0),
    discountAmount: Number(cart.discountAmount ?? 0),
    grandTotal: Number(cart.grandTotal ?? 0),
    itemCount: 0,
  })),
}));

import {
  validateCoupon,
  calculateDiscount,
  applyCoupon,
  removeCoupon,
  CouponErrors,
} from "../../services/coupon.js";
import { prisma } from "../../lib/prisma.js";
import { recalculateCart, getCartWithDetails } from "../../services/cart.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePromotion(overrides: Record<string, any> = {}) {
  return {
    id: "promo-1",
    nameEn: "Test Coupon",
    nameAr: "كوبون اختبار",
    type: "coupon",
    discountType: "percentage",
    discountValue: 10 as unknown as Decimal,
    couponCode: "SAVE10",
    minimumOrderAmount: null,
    maximumDiscountCap: null,
    usageLimitTotal: null,
    usageLimitPerUser: null,
    usageCount: 0,
    startDate: new Date("2025-01-01"),
    endDate: new Date("2027-12-31"),
    isActive: true,
    priority: 0,
    stackingAllowed: false,
    conditions: null,
    products: [],
    categories: [],
    ...overrides,
  };
}

describe("Coupon Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── validateCoupon ─────────────────────────────────────────────────────────

  describe("validateCoupon", () => {
    it("returns promotion for valid coupon", async () => {
      const promotion = makePromotion();
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      const result = await validateCoupon("SAVE10", 500);

      expect(result).toEqual(promotion);
      expect(prisma.promotion.findFirst).toHaveBeenCalledWith({
        where: {
          couponCode: { equals: "SAVE10", mode: "insensitive" },
        },
        include: {
          products: true,
          categories: true,
        },
      });
    });

    it("throws NOT_FOUND for non-existent code", async () => {
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(null as any);

      await expect(validateCoupon("INVALID", 500)).rejects.toMatchObject({
        code: CouponErrors.NOT_FOUND,
        statusCode: 404,
      });
    });

    it("throws EXPIRED when isActive is false", async () => {
      const promotion = makePromotion({ isActive: false });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await expect(validateCoupon("SAVE10", 500)).rejects.toMatchObject({
        code: CouponErrors.EXPIRED,
        statusCode: 400,
      });
    });

    it("throws EXPIRED when before start date", async () => {
      const promotion = makePromotion({
        startDate: new Date("2099-01-01"),
        endDate: new Date("2099-12-31"),
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await expect(validateCoupon("SAVE10", 500)).rejects.toMatchObject({
        code: CouponErrors.EXPIRED,
      });
    });

    it("throws EXPIRED when after end date", async () => {
      const promotion = makePromotion({
        startDate: new Date("2020-01-01"),
        endDate: new Date("2020-12-31"),
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await expect(validateCoupon("SAVE10", 500)).rejects.toMatchObject({
        code: CouponErrors.EXPIRED,
      });
    });

    it("throws USAGE_EXCEEDED when total usage limit hit", async () => {
      const promotion = makePromotion({
        usageLimitTotal: 100,
        usageCount: 100,
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await expect(validateCoupon("SAVE10", 500)).rejects.toMatchObject({
        code: CouponErrors.USAGE_EXCEEDED,
      });
    });

    it("throws USAGE_EXCEEDED when per-user limit hit", async () => {
      const promotion = makePromotion({
        usageLimitPerUser: 1,
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.promotionUsage.count).mockResolvedValueOnce(1);

      await expect(validateCoupon("SAVE10", 500, "user-1")).rejects.toMatchObject({
        code: CouponErrors.USAGE_EXCEEDED,
      });
    });

    it("throws AUTH_REQUIRED when per-user limit set but no userId", async () => {
      const promotion = makePromotion({
        usageLimitPerUser: 1,
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await expect(validateCoupon("SAVE10", 500)).rejects.toMatchObject({
        code: CouponErrors.AUTH_REQUIRED,
        statusCode: 401,
      });
    });

    it("throws MIN_ORDER_NOT_MET when subtotal too low", async () => {
      const promotion = makePromotion({
        minimumOrderAmount: 200 as unknown as Decimal,
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await expect(validateCoupon("SAVE10", 100)).rejects.toMatchObject({
        code: CouponErrors.MIN_ORDER_NOT_MET,
      });
    });

    it("passes when subtotal meets minimum order amount", async () => {
      const promotion = makePromotion({
        minimumOrderAmount: 200 as unknown as Decimal,
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      const result = await validateCoupon("SAVE10", 250);

      expect(result).toEqual(promotion);
    });

    it("throws NOT_APPLICABLE when no matching products", async () => {
      const promotion = makePromotion({
        products: [{ id: "pp-1", promotionId: "promo-1", productId: "prod-99" }],
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);

      await expect(validateCoupon("SAVE10", 500)).rejects.toMatchObject({
        code: CouponErrors.NOT_APPLICABLE,
      });
    });

    it("passes when product restrictions match", async () => {
      const promotion = makePromotion({
        products: [{ id: "pp-1", promotionId: "promo-1", productId: "prod-1" }],
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([{ id: "prod-1" }] as any);

      const result = await validateCoupon("SAVE10", 500);

      expect(result).toEqual(promotion);
    });

    it("passes when category restrictions match", async () => {
      const promotion = makePromotion({
        categories: [{ id: "pc-1", promotionId: "promo-1", categoryId: "cat-1" }],
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([{ id: "prod-1" }] as any);

      const result = await validateCoupon("SAVE10", 500);

      expect(result).toEqual(promotion);
    });

    it("works case-insensitively", async () => {
      const promotion = makePromotion();
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);

      await validateCoupon("save10", 500);

      expect(prisma.promotion.findFirst).toHaveBeenCalledWith({
        where: {
          couponCode: { equals: "save10", mode: "insensitive" },
        },
        include: {
          products: true,
          categories: true,
        },
      });
    });

    it("allows coupon when per-user limit not yet reached", async () => {
      const promotion = makePromotion({
        usageLimitPerUser: 3,
      });
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.promotionUsage.count).mockResolvedValueOnce(2);

      const result = await validateCoupon("SAVE10", 500, "user-1");

      expect(result).toEqual(promotion);
      expect(prisma.promotionUsage.count).toHaveBeenCalledWith({
        where: {
          promotionId: "promo-1",
          userId: "user-1",
        },
      });
    });
  });

  // ─── calculateDiscount ──────────────────────────────────────────────────────

  describe("calculateDiscount", () => {
    it("calculates percentage discount correctly", () => {
      const result = calculateDiscount(
        { discountType: "percentage", discountValue: 10, maximumDiscountCap: null },
        200,
      );

      expect(result).toEqual({ discountAmount: 20, freeShipping: false });
    });

    it("caps percentage at maximumDiscountCap", () => {
      const result = calculateDiscount(
        { discountType: "percentage", discountValue: 50, maximumDiscountCap: 30 },
        200,
      );

      // 50% of 200 = 100, but capped at 30
      expect(result).toEqual({ discountAmount: 30, freeShipping: false });
    });

    it("does not cap when discount is under maximumDiscountCap", () => {
      const result = calculateDiscount(
        { discountType: "percentage", discountValue: 10, maximumDiscountCap: 100 },
        200,
      );

      // 10% of 200 = 20, under cap of 100
      expect(result).toEqual({ discountAmount: 20, freeShipping: false });
    });

    it("calculates fixed_amount correctly", () => {
      const result = calculateDiscount(
        { discountType: "fixed_amount", discountValue: 25, maximumDiscountCap: null },
        200,
      );

      expect(result).toEqual({ discountAmount: 25, freeShipping: false });
    });

    it("caps fixed_amount at subtotal", () => {
      const result = calculateDiscount(
        { discountType: "fixed_amount", discountValue: 300, maximumDiscountCap: null },
        200,
      );

      // Discount of 300 capped at subtotal of 200
      expect(result).toEqual({ discountAmount: 200, freeShipping: false });
    });

    it("returns freeShipping flag for free_shipping type", () => {
      const result = calculateDiscount(
        { discountType: "free_shipping", discountValue: 0, maximumDiscountCap: null },
        200,
      );

      expect(result).toEqual({ discountAmount: 0, freeShipping: true });
    });

    it("returns zero for unknown discount type", () => {
      const result = calculateDiscount(
        { discountType: "unknown" as any, discountValue: 50, maximumDiscountCap: null },
        200,
      );

      expect(result).toEqual({ discountAmount: 0, freeShipping: false });
    });
  });

  // ─── applyCoupon ──────────────────────────────────────────────────────────

  describe("applyCoupon", () => {
    it("applies valid coupon and updates cart", async () => {
      const cart = {
        id: "cart-1",
        userId: "user-1",
        couponCode: null,
        subtotal: 500 as unknown as Decimal,
        discountAmount: 0 as unknown as Decimal,
        taxAmount: 75 as unknown as Decimal,
        shippingEstimate: 0 as unknown as Decimal,
        grandTotal: 575 as unknown as Decimal,
      };
      const promotion = makePromotion();
      const updatedCart = {
        ...cart,
        couponCode: "SAVE10",
        discountAmount: 50 as unknown as Decimal,
        grandTotal: 525 as unknown as Decimal,
        items: [],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce(updatedCart as any);
      vi.mocked(getCartWithDetails).mockResolvedValueOnce(updatedCart as any);

      const result = await applyCoupon("cart-1", "SAVE10", "user-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          couponCode: "SAVE10",
          discountAmount: 50, // 10% of 500
        }),
      });
      expect(result).toBeDefined();
      expect(result.id).toBe("cart-1");
    });

    it("throws ALREADY_APPLIED if cart already has a coupon", async () => {
      const cart = {
        id: "cart-1",
        couponCode: "EXISTING",
        subtotal: 500 as unknown as Decimal,
      };
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);

      await expect(applyCoupon("cart-1", "SAVE10", "user-1")).rejects.toMatchObject({
        code: CouponErrors.ALREADY_APPLIED,
        statusCode: 400,
      });
    });

    it("throws when cart not found", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(null as any);

      await expect(applyCoupon("cart-999", "SAVE10")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("validates product applicability against cart items", async () => {
      const cart = {
        id: "cart-1",
        userId: "user-1",
        couponCode: null,
        subtotal: 500 as unknown as Decimal,
      };
      const promotion = makePromotion({
        products: [{ id: "pp-1", promotionId: "promo-1", productId: "prod-99" }],
      });

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      // validateCoupon's product check passes (products exist in DB)
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([{ id: "prod-99" }] as any);
      // But cart items don't match the restricted products
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([
        {
          id: "item-1",
          cartId: "cart-1",
          variant: {
            product: { id: "prod-1", categoryId: "cat-1" },
          },
        },
      ] as any);

      await expect(applyCoupon("cart-1", "SAVE10", "user-1")).rejects.toMatchObject({
        code: CouponErrors.NOT_APPLICABLE,
      });
    });

    it("applies free_shipping coupon correctly", async () => {
      const cart = {
        id: "cart-1",
        userId: "user-1",
        couponCode: null,
        subtotal: 200 as unknown as Decimal,
        discountAmount: 0 as unknown as Decimal,
        taxAmount: 30 as unknown as Decimal,
        shippingEstimate: 30 as unknown as Decimal,
        grandTotal: 260 as unknown as Decimal,
      };
      const promotion = makePromotion({
        discountType: "free_shipping",
        discountValue: 0 as unknown as Decimal,
      });
      const updatedCart = {
        ...cart,
        couponCode: "FREESHIP",
        shippingEstimate: 0,
        grandTotal: 230,
        items: [],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);
      vi.mocked(prisma.promotion.findFirst).mockResolvedValueOnce(promotion as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce(updatedCart as any);
      vi.mocked(getCartWithDetails).mockResolvedValueOnce(updatedCart as any);

      const result = await applyCoupon("cart-1", "FREESHIP", "user-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          discountAmount: 0,
          shippingEstimate: 0,
        }),
      });
      expect(result).toBeDefined();
    });
  });

  // ─── removeCoupon ─────────────────────────────────────────────────────────

  describe("removeCoupon", () => {
    it("clears coupon from cart and recalculates", async () => {
      const cart = {
        id: "cart-1",
        couponCode: "SAVE10",
        subtotal: 500 as unknown as Decimal,
        discountAmount: 50 as unknown as Decimal,
      };
      const clearedCart = {
        ...cart,
        couponCode: null,
        discountAmount: 0,
        items: [],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cart as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce(clearedCart as any);
      vi.mocked(recalculateCart).mockResolvedValueOnce(undefined);
      vi.mocked(getCartWithDetails).mockResolvedValueOnce(clearedCart as any);

      const result = await removeCoupon("cart-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: {
          couponCode: null,
          discountAmount: 0,
          lastActivityAt: expect.any(Date),
        },
      });
      expect(recalculateCart).toHaveBeenCalledWith("cart-1");
      expect(result).toBeDefined();
      expect(result.id).toBe("cart-1");
    });

    it("throws when cart not found", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(null as any);

      await expect(removeCoupon("cart-999")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
