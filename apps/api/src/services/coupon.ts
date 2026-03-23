import { prisma } from "../lib/prisma.js";
import { AppError, notFound } from "../middleware/error-handler.js";
import { recalculateCart, getCartWithDetails, formatCartResponse } from "./cart.js";

// ─── Error Codes ────────────────────────────────────────────────────────────

export const CouponErrors = {
  NOT_FOUND: "COUPON_NOT_FOUND",
  EXPIRED: "COUPON_EXPIRED",
  USAGE_EXCEEDED: "COUPON_USAGE_EXCEEDED",
  MIN_ORDER_NOT_MET: "COUPON_MIN_ORDER_NOT_MET",
  NOT_APPLICABLE: "COUPON_NOT_APPLICABLE",
  ALREADY_APPLIED: "COUPON_ALREADY_APPLIED",
  AUTH_REQUIRED: "AUTH_REQUIRED_FOR_COUPON",
} as const;

// ─── Validate Coupon ────────────────────────────────────────────────────────

export async function validateCoupon(
  code: string,
  cartSubtotal: number,
  userId?: string,
) {
  // 1. Find promotion by couponCode (case-insensitive)
  const promotion = await prisma.promotion.findFirst({
    where: {
      couponCode: { equals: code, mode: "insensitive" },
    },
    include: {
      products: true,
      categories: true,
    },
  });

  if (!promotion) {
    throw new AppError("Coupon not found", 404, CouponErrors.NOT_FOUND);
  }

  // 2. Check isActive
  if (!promotion.isActive) {
    throw new AppError("Coupon has expired", 400, CouponErrors.EXPIRED);
  }

  // 3. Check date range
  const now = new Date();
  if (now < promotion.startDate || now > promotion.endDate) {
    throw new AppError("Coupon has expired", 400, CouponErrors.EXPIRED);
  }

  // 4. Check total usage limit
  if (
    promotion.usageLimitTotal !== null &&
    promotion.usageCount >= promotion.usageLimitTotal
  ) {
    throw new AppError(
      "Coupon usage limit has been reached",
      400,
      CouponErrors.USAGE_EXCEEDED,
    );
  }

  // 5 & 6. Per-user usage limit
  if (promotion.usageLimitPerUser !== null) {
    if (!userId) {
      throw new AppError(
        "Authentication is required to use this coupon",
        401,
        CouponErrors.AUTH_REQUIRED,
      );
    }

    const userUsageCount = await prisma.promotionUsage.count({
      where: {
        promotionId: promotion.id,
        userId,
      },
    });

    if (userUsageCount >= promotion.usageLimitPerUser) {
      throw new AppError(
        "You have already used this coupon the maximum number of times",
        400,
        CouponErrors.USAGE_EXCEEDED,
      );
    }
  }

  // 7. Minimum order amount
  if (
    promotion.minimumOrderAmount !== null &&
    cartSubtotal < Number(promotion.minimumOrderAmount)
  ) {
    throw new AppError(
      `Minimum order amount of ${Number(promotion.minimumOrderAmount)} is required`,
      400,
      CouponErrors.MIN_ORDER_NOT_MET,
    );
  }

  // 8. Product/category applicability
  const hasProductRestrictions = promotion.products.length > 0;
  const hasCategoryRestrictions = promotion.categories.length > 0;

  if (hasProductRestrictions || hasCategoryRestrictions) {
    const applicableProductIds = promotion.products.map((p) => p.productId);
    const applicableCategoryIds = promotion.categories.map((c) => c.categoryId);

    // We need to check cart items — find the cart by looking up items
    // This is a validation helper; the caller (applyCoupon) passes the subtotal
    // For standalone validation, we check if there are ANY matching products in stock
    // For the applyCoupon flow, we verify against the actual cart
    const matchingProducts = await prisma.product.findMany({
      where: {
        OR: [
          ...(hasProductRestrictions
            ? [{ id: { in: applicableProductIds } }]
            : []),
          ...(hasCategoryRestrictions
            ? [{ categoryId: { in: applicableCategoryIds } }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (matchingProducts.length === 0) {
      throw new AppError(
        "Coupon is not applicable to any products",
        400,
        CouponErrors.NOT_APPLICABLE,
      );
    }
  }

  return promotion;
}

// ─── Validate Coupon Against Cart ───────────────────────────────────────────

async function validateCouponAgainstCart(
  promotion: Awaited<ReturnType<typeof validateCoupon>>,
  cartId: string,
) {
  const hasProductRestrictions = promotion.products.length > 0;
  const hasCategoryRestrictions = promotion.categories.length > 0;

  if (!hasProductRestrictions && !hasCategoryRestrictions) return;

  const applicableProductIds = promotion.products.map((p) => p.productId);
  const applicableCategoryIds = promotion.categories.map((c) => c.categoryId);

  // Fetch cart items with product info
  const cartItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      variant: {
        include: {
          product: { select: { id: true, categoryId: true } },
        },
      },
    },
  });

  const hasMatchingItem = cartItems.some((item) => {
    const product = item.variant.product;
    const matchesProduct =
      hasProductRestrictions && applicableProductIds.includes(product.id);
    const matchesCategory =
      hasCategoryRestrictions &&
      applicableCategoryIds.includes(product.categoryId);
    return matchesProduct || matchesCategory;
  });

  if (!hasMatchingItem) {
    throw new AppError(
      "Coupon is not applicable to any items in your cart",
      400,
      CouponErrors.NOT_APPLICABLE,
    );
  }
}

// ─── Calculate Discount ─────────────────────────────────────────────────────

export function calculateDiscount(
  promotion: { discountType: string; discountValue: unknown; maximumDiscountCap: unknown },
  subtotal: number,
): { discountAmount: number; freeShipping: boolean } {
  const discountValue = Number(promotion.discountValue);
  const maximumDiscountCap = promotion.maximumDiscountCap
    ? Number(promotion.maximumDiscountCap)
    : null;

  switch (promotion.discountType) {
    case "percentage": {
      let amount = (subtotal * discountValue) / 100;
      if (maximumDiscountCap !== null && amount > maximumDiscountCap) {
        amount = maximumDiscountCap;
      }
      return { discountAmount: amount, freeShipping: false };
    }

    case "fixed_amount": {
      let amount = discountValue;
      if (amount > subtotal) {
        amount = subtotal;
      }
      return { discountAmount: amount, freeShipping: false };
    }

    case "free_shipping": {
      return { discountAmount: 0, freeShipping: true };
    }

    default:
      return { discountAmount: 0, freeShipping: false };
  }
}

// ─── Apply Coupon ───────────────────────────────────────────────────────────

export async function applyCoupon(cartId: string, code: string, userId?: string) {
  // Check cart exists
  const cart = await prisma.cart.findUnique({ where: { id: cartId } });
  if (!cart) throw notFound("Cart not found");

  // Check if cart already has a coupon
  if (cart.couponCode) {
    throw new AppError(
      "A coupon is already applied to this cart",
      400,
      CouponErrors.ALREADY_APPLIED,
    );
  }

  const subtotal = Number(cart.subtotal);

  // Validate the coupon
  const promotion = await validateCoupon(code, subtotal, userId);

  // Validate against cart items (product/category applicability)
  await validateCouponAgainstCart(promotion, cartId);

  // Calculate discount
  const { discountAmount, freeShipping } = calculateDiscount(promotion, subtotal);

  // Update cart with coupon
  const taxAmount = subtotal * 0.15;
  const baseShipping = subtotal >= 500 ? 0 : 30;
  const shippingEstimate = freeShipping ? 0 : baseShipping;
  const grandTotal = subtotal + taxAmount + shippingEstimate - discountAmount;

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      couponCode: promotion.couponCode,
      discountAmount,
      shippingEstimate,
      grandTotal,
      lastActivityAt: new Date(),
    },
  });

  const updatedCart = await getCartWithDetails(cartId);
  return formatCartResponse(updatedCart);
}

// ─── Remove Coupon ──────────────────────────────────────────────────────────

export async function removeCoupon(cartId: string) {
  const cart = await prisma.cart.findUnique({ where: { id: cartId } });
  if (!cart) throw notFound("Cart not found");

  // Clear coupon fields
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      couponCode: null,
      discountAmount: 0,
      lastActivityAt: new Date(),
    },
  });

  // Recalculate cart totals (will reset shipping and grand total)
  await recalculateCart(cartId);

  const updatedCart = await getCartWithDetails(cartId);
  return formatCartResponse(updatedCart);
}
