import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Decimal } from "@prisma/client/runtime/client";

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
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock coupon service (imported by cart.ts)
vi.mock("../../services/coupon.js", () => ({
  calculateDiscount: vi.fn(),
}));

// Mock error handlers
vi.mock("../../middleware/error-handler.js", () => ({
  badRequest: (msg: string) => Object.assign(new Error(msg), { statusCode: 400 }),
  notFound: (msg: string) => Object.assign(new Error(msg), { statusCode: 404 }),
}));

import {
  getOrCreateCart,
  addItem,
  updateItemQuantity,
  removeItem,
  recalculateCart,
  mergeCarts,
} from "../../services/cart.js";
import { prisma } from "../../lib/prisma.js";

describe("Cart Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getOrCreateCart ───────────────────────────────────────────────────────
  describe("getOrCreateCart", () => {
    it("returns existing cart for userId", async () => {
      const existingCart = { id: "cart-1", userId: "user-1", sessionId: null };
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(existingCart as any);

      const result = await getOrCreateCart("user-1");

      expect(result).toEqual(existingCart);
      expect(prisma.cart.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it("creates new cart for userId when none exists", async () => {
      const newCart = { id: "cart-2", userId: "user-2", sessionId: null };
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cart.create).mockResolvedValueOnce(newCart as any);

      const result = await getOrCreateCart("user-2");

      expect(result).toEqual(newCart);
      expect(prisma.cart.create).toHaveBeenCalledWith({ data: { userId: "user-2" } });
    });

    it("returns existing cart for sessionId", async () => {
      const existingCart = { id: "cart-3", userId: null, sessionId: "session-1" };
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(existingCart as any);

      const result = await getOrCreateCart(undefined, "session-1");

      expect(result).toEqual(existingCart);
      expect(prisma.cart.findFirst).toHaveBeenCalledWith({ where: { sessionId: "session-1" } });
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it("throws when no userId or sessionId", async () => {
      await expect(getOrCreateCart()).rejects.toThrow("Either userId or sessionId is required");
    });
  });

  // ─── addItem ───────────────────────────────────────────────────────────────
  describe("addItem", () => {
    it("creates new CartItem with correct unitPriceAtAddition", async () => {
      const variant = {
        id: "var-1",
        stockQuantity: 10,
        priceOverride: null,
        product: {
          id: "prod-1",
          status: "published",
          deletedAt: null,
          basePrice: 50 as unknown as Decimal,
        },
      };
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(variant as any);
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.cartItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await addItem("cart-1", "var-1", 2);

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: "cart-1",
          productVariantId: "var-1",
          quantity: 2,
          unitPriceAtAddition: 50,
        },
      });
    });

    it("increments quantity for existing variant", async () => {
      const variant = {
        id: "var-1",
        stockQuantity: 10,
        priceOverride: null,
        product: {
          id: "prod-1",
          status: "published",
          deletedAt: null,
          basePrice: 50 as unknown as Decimal,
        },
      };
      const existingItem = { id: "item-1", quantity: 2 };
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(variant as any);
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce(existingItem as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await addItem("cart-1", "var-1", 3);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { quantity: 5 },
      });
    });

    it("throws when over stock limit", async () => {
      const variant = {
        id: "var-1",
        stockQuantity: 5,
        priceOverride: null,
        product: {
          id: "prod-1",
          status: "published",
          deletedAt: null,
          basePrice: 50 as unknown as Decimal,
        },
      };
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(variant as any);
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce({ quantity: 3 } as any);

      await expect(addItem("cart-1", "var-1", 5)).rejects.toThrow(
        "Only 5 items available in stock",
      );
    });

    it("throws when product not published", async () => {
      const variant = {
        id: "var-1",
        stockQuantity: 10,
        priceOverride: null,
        product: {
          id: "prod-1",
          status: "draft",
          deletedAt: null,
          basePrice: 50 as unknown as Decimal,
        },
      };
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(variant as any);

      await expect(addItem("cart-1", "var-1", 1)).rejects.toThrow(
        "Product is not available",
      );
    });

    it("throws when variant not found", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(null as any);

      await expect(addItem("cart-1", "var-999", 1)).rejects.toThrow(
        "Product variant not found",
      );
    });
  });

  // ─── recalculateCart ───────────────────────────────────────────────────────
  describe("recalculateCart", () => {
    it("computes correct subtotal", async () => {
      const items = [
        {
          quantity: 2,
          variant: {
            priceOverride: null,
            product: { basePrice: 100 as unknown as Decimal },
          },
        },
        {
          quantity: 1,
          variant: {
            priceOverride: null,
            product: { basePrice: 50 as unknown as Decimal },
          },
        },
      ];
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(items as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await recalculateCart("cart-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          subtotal: 250, // 2*100 + 1*50
        }),
      });
    });

    it("VAT is exactly 15%", async () => {
      const items = [
        {
          quantity: 1,
          variant: {
            priceOverride: null,
            product: { basePrice: 100 as unknown as Decimal },
          },
        },
      ];
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(items as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await recalculateCart("cart-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          taxAmount: 15, // 100 * 0.15
        }),
      });
    });

    it("free shipping when subtotal >= 500", async () => {
      const items = [
        {
          quantity: 1,
          variant: {
            priceOverride: null,
            product: { basePrice: 500 as unknown as Decimal },
          },
        },
      ];
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(items as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await recalculateCart("cart-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          shippingEstimate: 0,
        }),
      });
    });

    it("30 SAR shipping when subtotal < 500", async () => {
      const items = [
        {
          quantity: 1,
          variant: {
            priceOverride: null,
            product: { basePrice: 100 as unknown as Decimal },
          },
        },
      ];
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(items as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await recalculateCart("cart-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          shippingEstimate: 30,
        }),
      });
    });

    it("uses priceOverride when present", async () => {
      const items = [
        {
          quantity: 1,
          variant: {
            priceOverride: 80 as unknown as Decimal,
            product: { basePrice: 100 as unknown as Decimal },
          },
        },
      ];
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(items as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await recalculateCart("cart-1");

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: "cart-1" },
        data: expect.objectContaining({
          subtotal: 80,
          taxAmount: 12, // 80 * 0.15
          grandTotal: 122, // 80 + 12 + 30
        }),
      });
    });
  });

  // ─── updateItemQuantity ────────────────────────────────────────────────────
  describe("updateItemQuantity", () => {
    it("with quantity 0 removes item", async () => {
      const item = { id: "item-1", cartId: "cart-1" };
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(item as any);
      vi.mocked(prisma.cartItem.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await updateItemQuantity("cart-1", "item-1", 0);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    });

    it("throws when quantity exceeds stock", async () => {
      const item = {
        id: "item-1",
        cartId: "cart-1",
        variant: { stockQuantity: 5 },
      };
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(item as any);

      await expect(updateItemQuantity("cart-1", "item-1", 10)).rejects.toThrow(
        "Only 5 items available in stock",
      );
    });

    it("updates quantity and recalculates", async () => {
      const item = {
        id: "item-1",
        cartId: "cart-1",
        variant: { stockQuantity: 10 },
      };
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(item as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await updateItemQuantity("cart-1", "item-1", 5);

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { quantity: 5 },
      });
    });
  });

  // ─── removeItem ────────────────────────────────────────────────────────────
  describe("removeItem", () => {
    it("deletes item and recalculates", async () => {
      const item = { id: "item-1", cartId: "cart-1" };
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(item as any);
      vi.mocked(prisma.cartItem.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "cart-1", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await removeItem("cart-1", "item-1");

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    });

    it("throws notFound when item not found", async () => {
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(null as any);

      await expect(removeItem("cart-1", "item-999")).rejects.toThrow("Cart item not found");
    });
  });

  // ─── mergeCarts ────────────────────────────────────────────────────────────
  describe("mergeCarts", () => {
    it("keeps higher quantity for duplicate variants", async () => {
      const guestCart = {
        id: "guest-cart",
        items: [
          { id: "guest-item-1", productVariantId: "var-1", quantity: 5 },
        ],
      };
      const userCart = { id: "user-cart", userId: "user-1" };
      const userItems = [{ id: "user-item-1", productVariantId: "var-1", quantity: 3 }];

      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(guestCart as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(userCart as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(userItems as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "user-cart", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await mergeCarts("user-1", "session-1");

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: "user-item-1" },
        data: { quantity: 5 },
      });
    });

    it("moves non-duplicate items to user cart", async () => {
      const guestCart = {
        id: "guest-cart",
        items: [
          { id: "guest-item-1", productVariantId: "var-2", quantity: 2 },
        ],
      };
      const userCart = { id: "user-cart", userId: "user-1" };
      const userItems = [{ id: "user-item-1", productVariantId: "var-1", quantity: 3 }];

      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(guestCart as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(userCart as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce(userItems as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "user-cart", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await mergeCarts("user-1", "session-1");

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: "guest-item-1" },
        data: { cartId: "user-cart" },
      });
    });

    it("deletes guest cart", async () => {
      const guestCart = {
        id: "guest-cart",
        items: [
          { id: "guest-item-1", productVariantId: "var-1", quantity: 2 },
        ],
      };
      const userCart = { id: "user-cart", userId: "user-1" };

      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(guestCart as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(userCart as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cartItem.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: "user-cart", couponCode: null } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce({} as any);

      await mergeCarts("user-1", "session-1");

      expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: "guest-cart" } });
    });

    it("does nothing when guest cart empty", async () => {
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(null as any);

      await mergeCarts("user-1", "session-1");

      expect(prisma.cart.findUnique).not.toHaveBeenCalled();
      expect(prisma.cartItem.findMany).not.toHaveBeenCalled();
    });
  });
});
