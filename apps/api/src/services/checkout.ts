import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError, badRequest } from "../middleware/error-handler.js";
import { getRedisClient } from "./redis.js";
import { getAddress } from "./address.js";

export const CheckoutErrors = {
  CART_EMPTY: "CART_EMPTY",
  STOCK_INSUFFICIENT: "STOCK_INSUFFICIENT",
  PRICE_CHANGED: "PRICE_CHANGED",
} as const;

export const guestAddressSchema = z.object({
  recipientName: z.string().min(1).max(100),
  streetLine1: z.string().min(1).max(200),
  streetLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{5}$/),
  country: z.string().default("SA"),
  phone: z.string().regex(/^(\+966|0)[0-9]{9}$/),
  deliveryInstructions: z.string().max(500).optional(),
});

export const checkoutSchema = z.object({
  shippingAddressId: z.string().uuid().optional(),
  shippingAddress: guestAddressSchema.optional(),
  guestEmail: z.string().email().optional(),
  saveAddress: z.boolean().optional().default(false),
  idempotencyKey: z.string().uuid(),
}).refine(
  (d) => d.shippingAddressId || d.shippingAddress,
  { message: "Either shippingAddressId or shippingAddress is required" },
);

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function generateOrderNumber(): Promise<string> {
  const redis = getRedisClient();
  const now = new Date();
  const saudiDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const dateStr = saudiDate.toISOString().slice(0, 10).replace(/-/g, "");
  const key = `order-seq:${dateStr}`;
  const seq = await redis.incr(key);
  if (seq === 1) {
    const tomorrow = new Date(saudiDate);
    tomorrow.setUTCHours(24, 0, 0, 0);
    const midnightSaudi = new Date(tomorrow.getTime() - 3 * 60 * 60 * 1000);
    await redis.expireat(key, Math.floor(midnightSaudi.getTime() / 1000));
  }
  return `ORD-${dateStr}-${String(seq).padStart(5, "0")}`;
}

export async function createOrder(
  cartId: string,
  userId: string | undefined,
  input: CheckoutInput,
) {
  const existingOrder = await prisma.order.findFirst({
    where: { idempotencyKey: input.idempotencyKey },
    include: { items: true },
  });
  if (existingOrder) return existingOrder;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
              },
            },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty", 400, CheckoutErrors.CART_EMPTY);
  }

  const stockIssues: Array<{ variantId: string; requested: number; available: number }> = [];
  const priceChanges: Array<{ variantId: string; oldPrice: number; newPrice: number }> = [];

  for (const item of cart.items) {
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: item.productVariantId },
      include: { product: { select: { basePrice: true } } },
    });
    if (!currentVariant) continue;

    const effectivePrice = currentVariant.priceOverride
      ? Number(currentVariant.priceOverride)
      : Number(currentVariant.product.basePrice);
    const storedPrice = Number(item.unitPriceAtAddition);

    if (effectivePrice !== storedPrice) {
      priceChanges.push({ variantId: item.productVariantId, oldPrice: storedPrice, newPrice: effectivePrice });
    }

    if (item.quantity > currentVariant.stockQuantity) {
      stockIssues.push({ variantId: item.productVariantId, requested: item.quantity, available: currentVariant.stockQuantity });
    }
  }

  if (priceChanges.length > 0) {
    const err = new AppError("Prices have changed for some items", 409, CheckoutErrors.PRICE_CHANGED);
    (err as any).details = { priceChanges };
    throw err;
  }

  if (stockIssues.length > 0) {
    const err = new AppError("Some items are no longer available in the requested quantity", 409, CheckoutErrors.STOCK_INSUFFICIENT);
    (err as any).details = { stockIssues };
    throw err;
  }

  let addressSnapshot: Record<string, unknown>;
  if (input.shippingAddressId && userId) {
    const saved = await getAddress(userId, input.shippingAddressId);
    addressSnapshot = {
      recipientName: saved.recipientName,
      streetLine1: saved.streetLine1,
      streetLine2: saved.streetLine2,
      city: saved.city,
      region: saved.region,
      postalCode: saved.postalCode,
      country: saved.country,
      phone: saved.phone,
      deliveryInstructions: saved.deliveryInstructions,
    };
  } else if (input.shippingAddress) {
    addressSnapshot = { ...input.shippingAddress };
  } else {
    throw badRequest("Shipping address is required");
  }

  const orderNumber = await generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: userId ?? null,
        guestEmail: input.guestEmail ?? null,
        status: "pending_payment",
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        shippingFee: cart.shippingEstimate,
        grandTotal: cart.grandTotal,
        currency: "SAR",
        shippingAddress: addressSnapshot as any,
        billingAddress: null as any,
        couponCodeUsed: cart.couponCode ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    });

    for (const item of cart.items) {
      const effectivePrice = item.variant.priceOverride
        ? Number(item.variant.priceOverride)
        : Number(item.variant.product.basePrice);
      const lineTotal = effectivePrice * item.quantity;

      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productVariantId: item.productVariantId,
          productTitleSnapshot: { en: item.variant.product.titleEn, ar: item.variant.product.titleAr },
          variantAttributesSnapshot: item.variant.attributes ?? {},
          skuSnapshot: item.variant.sku,
          unitPrice: effectivePrice,
          quantity: item.quantity,
          lineTotal,
        },
      });

      const updated = await tx.productVariant.updateMany({
        where: { id: item.productVariantId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (updated.count === 0) {
        throw new AppError(`Insufficient stock for variant ${item.productVariantId}`, 409, CheckoutErrors.STOCK_INSUFFICIENT);
      }
    }

    await tx.orderStatusHistory.create({
      data: { orderId: newOrder.id, fromStatus: null, toStatus: "pending_payment" },
    });

    await tx.cartItem.deleteMany({ where: { cartId } });
    await tx.cart.update({
      where: { id: cartId },
      data: { subtotal: 0, discountAmount: 0, taxAmount: 0, shippingEstimate: 0, grandTotal: 0, couponCode: null },
    });

    return newOrder;
  });

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });

  if (!userId && fullOrder) {
    const addressData = fullOrder.shippingAddress as Record<string, unknown>;
    const params = new URLSearchParams({
      email: input.guestEmail ?? "",
      name: (addressData.recipientName as string) ?? "",
      phone: (addressData.phone as string) ?? "",
    });
    (fullOrder as any).oneClickRegisterUrl = `/auth/register?${params.toString()}`;
  }

  return fullOrder;
}
