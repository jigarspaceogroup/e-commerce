import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../middleware/error-handler.js";
import { calculateDiscount } from "./coupon.js";

// ─── Get or Create ──────────────────────────────────────────────────────────

export async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (userId) {
    const existing = await prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId } });
  }
  if (sessionId) {
    const existing = await prisma.cart.findFirst({ where: { sessionId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { sessionId } });
  }
  throw badRequest("Either userId or sessionId is required");
}

// ─── Get Cart with Details ──────────────────────────────────────────────────

export async function getCartWithDetails(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!cart) throw notFound("Cart not found");
  return cart;
}

// ─── Format Cart Response ───────────────────────────────────────────────────

export function formatCartResponse(cart: Awaited<ReturnType<typeof getCartWithDetails>>) {
  const items = cart.items.map((item) => {
    const effectivePrice = item.variant.priceOverride
      ? Number(item.variant.priceOverride)
      : Number(item.variant.product.basePrice);
    return {
      id: item.id,
      quantity: item.quantity,
      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        attributes: item.variant.attributes as Record<string, string>,
        stockQuantity: item.variant.stockQuantity,
        effectivePrice,
      },
      product: {
        id: item.variant.product.id,
        titleEn: item.variant.product.titleEn,
        titleAr: item.variant.product.titleAr,
        slug: item.variant.product.slug,
        image: item.variant.product.images[0]
          ? { url: item.variant.product.images[0].url, altTextEn: item.variant.product.images[0].altTextEn ?? "" }
          : null,
      },
    };
  });

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    id: cart.id,
    couponCode: cart.couponCode ?? null,
    items,
    subtotal: Number(cart.subtotal),
    taxAmount: Number(cart.taxAmount),
    shippingEstimate: Number(cart.shippingEstimate),
    discountAmount: Number(cart.discountAmount),
    grandTotal: Number(cart.grandTotal),
    itemCount,
  };
}

// ─── Add Item ───────────────────────────────────────────────────────────────

export async function addItem(cartId: string, productVariantId: string, quantity: number) {
  // Validate variant exists, is active, product is published
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    include: { product: true },
  });
  if (!variant) throw notFound("Product variant not found");
  if (variant.product.status !== "published") throw badRequest("Product is not available");
  if (variant.product.deletedAt) throw badRequest("Product is not available");

  // Check existing cart item
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productVariantId: { cartId, productVariantId } },
  });

  const totalQty = (existing?.quantity ?? 0) + quantity;
  if (totalQty > variant.stockQuantity) {
    throw badRequest(`Only ${variant.stockQuantity} items available in stock`);
  }

  const unitPrice = variant.priceOverride ?? variant.product.basePrice;

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: totalQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        productVariantId,
        quantity,
        unitPriceAtAddition: unitPrice,
      },
    });
  }

  await recalculateCart(cartId);
}

// ─── Update Quantity ────────────────────────────────────────────────────────

export async function updateItemQuantity(cartId: string, itemId: string, quantity: number) {
  if (quantity === 0) {
    return removeItem(cartId, itemId);
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: { variant: true },
  });
  if (!item) throw notFound("Cart item not found");

  if (quantity > item.variant.stockQuantity) {
    throw badRequest(`Only ${item.variant.stockQuantity} items available in stock`);
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  await recalculateCart(cartId);
}

// ─── Remove Item ────────────────────────────────────────────────────────────

export async function removeItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) throw notFound("Cart item not found");

  await prisma.cartItem.delete({ where: { id: itemId } });
  await recalculateCart(cartId);
}

// ─── Recalculate Cart ───────────────────────────────────────────────────────

export async function recalculateCart(cartId: string) {
  const cart = await prisma.cart.findUnique({ where: { id: cartId } });
  if (!cart) throw notFound("Cart not found");

  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      variant: { include: { product: { select: { basePrice: true } } } },
    },
  });

  let subtotal = 0;
  for (const item of items) {
    const effectivePrice = item.variant.priceOverride
      ? Number(item.variant.priceOverride)
      : Number(item.variant.product.basePrice);
    subtotal += effectivePrice * item.quantity;
  }

  // Calculate coupon discount if a coupon is applied
  let discountAmount = 0;
  let freeShipping = false;

  if (cart.couponCode) {
    const promotion = await prisma.promotion.findFirst({
      where: { couponCode: { equals: cart.couponCode, mode: "insensitive" } },
    });

    if (promotion && promotion.isActive) {
      const result = calculateDiscount(promotion, subtotal);
      discountAmount = result.discountAmount;
      freeShipping = result.freeShipping;
    } else {
      // Coupon no longer valid — clear it from the cart
      await prisma.cart.update({
        where: { id: cartId },
        data: { couponCode: null },
      });
    }
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount > 0 ? taxableAmount * 0.15 : 0;
  const baseShipping = subtotal >= 500 ? 0 : 30;
  const shippingEstimate = freeShipping ? 0 : baseShipping;
  const grandTotal = subtotal + taxAmount + shippingEstimate - discountAmount;

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal,
      taxAmount,
      shippingEstimate,
      discountAmount,
      grandTotal,
      lastActivityAt: new Date(),
    },
  });
}

// ─── Merge Carts ────────────────────────────────────────────────────────────

export async function mergeCarts(userId: string, guestSessionId: string) {
  const guestCart = await prisma.cart.findFirst({
    where: { sessionId: guestSessionId },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) return;

  const userCart = await getOrCreateCart(userId);
  const userItems = await prisma.cartItem.findMany({ where: { cartId: userCart.id } });
  const userVariantMap = new Map(userItems.map((i) => [i.productVariantId, i]));

  for (const guestItem of guestCart.items) {
    const existingUserItem = userVariantMap.get(guestItem.productVariantId);
    if (existingUserItem) {
      // Keep higher quantity
      const maxQty = Math.max(existingUserItem.quantity, guestItem.quantity);
      await prisma.cartItem.update({
        where: { id: existingUserItem.id },
        data: { quantity: maxQty },
      });
    } else {
      // Move guest item to user cart
      await prisma.cartItem.update({
        where: { id: guestItem.id },
        data: { cartId: userCart.id },
      });
    }
  }

  // Delete guest cart
  await prisma.cart.delete({ where: { id: guestCart.id } });

  await recalculateCart(userCart.id);
}
