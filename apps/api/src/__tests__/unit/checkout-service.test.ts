import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock Redis
vi.mock("../../services/redis.js", () => ({
  getRedisClient: vi.fn(() => ({
    incr: vi.fn(),
    expireat: vi.fn(),
  })),
}));

// Mock address service
vi.mock("../../services/address.js", () => ({
  getAddress: vi.fn(),
}));

// Mock error handlers
vi.mock("../../middleware/error-handler.js", () => ({
  AppError: class AppError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public code: string,
    ) {
      super(message);
      this.name = "AppError";
    }
  },
  badRequest: (msg: string) => {
    const err = new Error(msg) as any;
    err.statusCode = 400;
    err.code = "BAD_REQUEST";
    return err;
  },
  notFound: (msg: string) => {
    const err = new Error(msg) as any;
    err.statusCode = 404;
    err.code = "RESOURCE_NOT_FOUND";
    return err;
  },
  conflict: (msg: string) => {
    const err = new Error(msg) as any;
    err.statusCode = 409;
    err.code = "CONFLICT";
    return err;
  },
}));

import { createOrder, generateOrderNumber, CheckoutErrors } from "../../services/checkout.js";
import { prisma } from "../../lib/prisma.js";
import { getRedisClient } from "../../services/redis.js";
import { getAddress } from "../../services/address.js";

const USER_ID = "user-1";
const CART_ID = "cart-1";
const VARIANT_ID = "variant-1";
const ADDRESS_ID = "addr-1";

const sampleVariant = {
  id: VARIANT_ID,
  productId: "product-1",
  sku: "SKU-001",
  attributes: { color: "Blue", size: "M" },
  priceOverride: null,
  stockQuantity: 10,
  product: {
    id: "product-1",
    titleEn: "T-Shirt",
    titleAr: "قميص",
    basePrice: "100.00",
    images: [{ id: "img-1", url: "https://example.com/img.jpg", altTextEn: "", altTextAr: "", sortOrder: 0 }],
  },
};

const sampleCartItem = {
  id: "cart-item-1",
  cartId: CART_ID,
  productVariantId: VARIANT_ID,
  quantity: 2,
  unitPriceAtAddition: "100.00",
  variant: sampleVariant,
};

const sampleCart = {
  id: CART_ID,
  userId: USER_ID,
  guestId: null,
  subtotal: "200.00",
  discountAmount: "0.00",
  taxAmount: "30.00",
  shippingEstimate: "20.00",
  grandTotal: "250.00",
  couponCode: null,
  items: [sampleCartItem],
};

const sampleAddress = {
  id: ADDRESS_ID,
  userId: USER_ID,
  recipientName: "Nael Mattar",
  streetLine1: "123 Main St",
  streetLine2: null,
  city: "Riyadh",
  region: "Riyadh",
  postalCode: "12345",
  country: "SA",
  phone: "+966500000000",
  deliveryInstructions: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Checkout Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default $transaction mock to execute callback
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma));
  });

  // ─── generateOrderNumber ─────────────────────────────────────────────────
  describe("generateOrderNumber", () => {
    it("generates order number in ORD-YYYYMMDD-XXXXX format", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

      const orderNumber = await generateOrderNumber();

      expect(orderNumber).toMatch(/^ORD-\d{8}-\d{5}$/);
      expect(mockRedis.incr).toHaveBeenCalledWith(expect.stringMatching(/^order-seq:\d{8}$/));
    });

    it("pads sequence number with leading zeros", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(42),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

      const orderNumber = await generateOrderNumber();

      expect(orderNumber).toMatch(/00042$/);
    });

    it("sets expiration for sequence key at midnight Saudi time", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

      await generateOrderNumber();

      expect(mockRedis.expireat).toHaveBeenCalledWith(
        expect.stringMatching(/^order-seq:\d{8}$/),
        expect.any(Number),
      );
    });
  });

  // ─── createOrder ─────────────────────────────────────────────────────────
  describe("createOrder", () => {
    const validInput = {
      shippingAddressId: ADDRESS_ID,
      idempotencyKey: "idem-key-1",
    };

    it("creates order with items, snapshots, and status history", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 1 } as any);

      const createdOrder = {
        id: "order-1",
        orderNumber: "ORD-20260323-00001",
        userId: USER_ID,
        guestEmail: null,
        status: "pending_payment",
        subtotal: "200.00",
        discountAmount: "0.00",
        taxAmount: "30.00",
        shippingFee: "20.00",
        grandTotal: "250.00",
        currency: "SAR",
        shippingAddress: {
          recipientName: "Nael Mattar",
          streetLine1: "123 Main St",
          streetLine2: null,
          city: "Riyadh",
          region: "Riyadh",
          postalCode: "12345",
          country: "SA",
          phone: "+966500000000",
          deliveryInstructions: null,
        },
        billingAddress: null,
        couponCodeUsed: null,
        idempotencyKey: "idem-key-1",
      };

      vi.mocked(prisma.order.create).mockResolvedValueOnce(createdOrder as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...createdOrder,
        items: [
          {
            id: "order-item-1",
            orderId: "order-1",
            productVariantId: VARIANT_ID,
            productTitleSnapshot: { en: "T-Shirt", ar: "قميص" },
            variantAttributesSnapshot: { color: "Blue", size: "M" },
            skuSnapshot: "SKU-001",
            unitPrice: "100.00",
            quantity: 2,
            lineTotal: "200.00",
          },
        ],
      } as any);

      const result = await createOrder(CART_ID, USER_ID, validInput);

      expect(result).toBeDefined();
      expect(result.orderNumber).toMatch(/^ORD-\d{8}-\d{5}$/);
      expect(result.items).toHaveLength(1);
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderNumber: expect.any(String),
          userId: USER_ID,
          status: "pending_payment",
          subtotal: "200.00",
          currency: "SAR",
          idempotencyKey: "idem-key-1",
        }),
      });
      expect(prisma.orderItem.create).toHaveBeenCalled();
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "order-1",
          fromStatus: null,
          toStatus: "pending_payment",
        }),
      });
    });

    it("throws CART_EMPTY when cart is empty", async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...sampleCart,
        items: [],
      } as any);

      await expect(createOrder(CART_ID, USER_ID, validInput)).rejects.toThrow("Your cart is empty");
    });

    it("throws CART_EMPTY when cart does not exist", async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(null as any);

      await expect(createOrder(CART_ID, USER_ID, validInput)).rejects.toThrow("Your cart is empty");
    });

    it("throws STOCK_INSUFFICIENT when stock is not available", async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        ...sampleVariant,
        stockQuantity: 1, // Less than requested 2
      } as any);

      await expect(createOrder(CART_ID, USER_ID, validInput)).rejects.toMatchObject({
        message: "Some items are no longer available in the requested quantity",
        code: CheckoutErrors.STOCK_INSUFFICIENT,
        details: {
          stockIssues: [
            {
              variantId: VARIANT_ID,
              requested: 2,
              available: 1,
            },
          ],
        },
      });
    });

    it("throws PRICE_CHANGED when item price has changed", async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        ...sampleVariant,
        product: {
          ...sampleVariant.product,
          basePrice: "120.00", // Changed from 100.00
        },
      } as any);

      await expect(createOrder(CART_ID, USER_ID, validInput)).rejects.toMatchObject({
        message: "Prices have changed for some items",
        code: CheckoutErrors.PRICE_CHANGED,
        details: {
          priceChanges: [
            {
              variantId: VARIANT_ID,
              oldPrice: 100,
              newPrice: 120,
            },
          ],
        },
      });
    });

    it("returns existing order when idempotency key already exists", async () => {
      const existingOrder = {
        id: "order-existing",
        orderNumber: "ORD-20260322-00001",
        userId: USER_ID,
        status: "pending_payment",
        idempotencyKey: "idem-key-1",
        items: [],
      };
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(existingOrder as any);

      const result = await createOrder(CART_ID, USER_ID, validInput);

      expect(result).toEqual(existingOrder);
      expect(prisma.cart.findUnique).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("creates guest order with guestEmail and oneClickRegisterUrl", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

      const guestInput = {
        shippingAddress: {
          recipientName: "Guest User",
          streetLine1: "456 Guest St",
          city: "Jeddah",
          region: "Makkah",
          postalCode: "54321",
          country: "SA",
          phone: "+966511111111",
        },
        guestEmail: "guest@example.com",
        idempotencyKey: "idem-key-guest",
      };

      const guestCart = {
        ...sampleCart,
        userId: null,
        guestId: "guest-1",
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(guestCart as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 1 } as any);

      const createdOrder = {
        id: "order-guest",
        orderNumber: "ORD-20260323-00001",
        userId: null,
        guestEmail: "guest@example.com",
        status: "pending_payment",
        subtotal: "200.00",
        discountAmount: "0.00",
        taxAmount: "30.00",
        shippingFee: "20.00",
        grandTotal: "250.00",
        currency: "SAR",
        shippingAddress: {
          recipientName: "Guest User",
          streetLine1: "456 Guest St",
          streetLine2: undefined,
          city: "Jeddah",
          region: "Makkah",
          postalCode: "54321",
          country: "SA",
          phone: "+966511111111",
          deliveryInstructions: undefined,
        },
        billingAddress: null,
        couponCodeUsed: null,
        idempotencyKey: "idem-key-guest",
      };

      vi.mocked(prisma.order.create).mockResolvedValueOnce(createdOrder as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...createdOrder,
        items: [],
      } as any);

      const result = await createOrder(CART_ID, undefined, guestInput);

      expect(result).toBeDefined();
      expect(result.userId).toBeNull();
      expect(result.guestEmail).toBe("guest@example.com");
      expect((result as any).oneClickRegisterUrl).toContain("/auth/register?");
      expect((result as any).oneClickRegisterUrl).toContain("email=guest%40example.com");
      expect((result as any).oneClickRegisterUrl).toContain("name=Guest+User");
    });

    it("snapshots saved address as JSON", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 1 } as any);

      const createdOrder = {
        id: "order-1",
        orderNumber: "ORD-20260323-00001",
        shippingAddress: {
          recipientName: "Nael Mattar",
          streetLine1: "123 Main St",
          streetLine2: null,
          city: "Riyadh",
          region: "Riyadh",
          postalCode: "12345",
          country: "SA",
          phone: "+966500000000",
          deliveryInstructions: null,
        },
      };

      vi.mocked(prisma.order.create).mockResolvedValueOnce(createdOrder as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...createdOrder,
        items: [],
      } as any);

      await createOrder(CART_ID, USER_ID, validInput);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shippingAddress: {
            recipientName: "Nael Mattar",
            streetLine1: "123 Main St",
            streetLine2: null,
            city: "Riyadh",
            region: "Riyadh",
            postalCode: "12345",
            country: "SA",
            phone: "+966500000000",
            deliveryInstructions: null,
          },
        }),
      });
    });

    it("clears cart items and resets totals after order creation", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 1 } as any);

      const createdOrder = { id: "order-1", orderNumber: "ORD-20260323-00001" };
      vi.mocked(prisma.order.create).mockResolvedValueOnce(createdOrder as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...createdOrder,
        items: [],
      } as any);

      await createOrder(CART_ID, USER_ID, validInput);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: CART_ID },
      });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: CART_ID },
        data: {
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          shippingEstimate: 0,
          grandTotal: 0,
          couponCode: null,
        },
      });
    });

    it("defaults billingAddress to null", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 1 } as any);

      const createdOrder = { id: "order-1", billingAddress: null };
      vi.mocked(prisma.order.create).mockResolvedValueOnce(createdOrder as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...createdOrder,
        items: [],
      } as any);

      await createOrder(CART_ID, USER_ID, validInput);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          billingAddress: null,
        }),
      });
    });

    it("decrements stock with optimistic locking", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 1 } as any);

      const createdOrder = { id: "order-1", orderNumber: "ORD-20260323-00001" };
      vi.mocked(prisma.order.create).mockResolvedValueOnce(createdOrder as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...createdOrder,
        items: [],
      } as any);

      await createOrder(CART_ID, USER_ID, validInput);

      expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: VARIANT_ID, stockQuantity: { gte: 2 } },
        data: { stockQuantity: { decrement: 2 } },
      });
    });

    it("throws STOCK_INSUFFICIENT when optimistic lock fails", async () => {
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expireat: vi.fn().mockResolvedValue(1),
      };
      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(sampleCart as any);
      vi.mocked(getAddress).mockResolvedValueOnce(sampleAddress as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.productVariant.updateMany).mockResolvedValueOnce({ count: 0 } as any);

      vi.mocked(prisma.order.create).mockResolvedValueOnce({ id: "order-1" } as any);
      vi.mocked(prisma.orderItem.create).mockResolvedValueOnce({} as any);

      await expect(createOrder(CART_ID, USER_ID, validInput)).rejects.toMatchObject({
        message: `Insufficient stock for variant ${VARIANT_ID}`,
        code: CheckoutErrors.STOCK_INSUFFICIENT,
      });
    });
  });
});
