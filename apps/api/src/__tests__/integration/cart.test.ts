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
      findMany: vi.fn().mockResolvedValue([]), // Default to empty array to prevent "not iterable" errors
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
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

const sampleProduct = {
  id: PRODUCT_ID,
  titleEn: "Test Product",
  titleAr: "منتج تجريبي",
  slug: "test-product",
  basePrice: 99.99,
  status: "published",
  deletedAt: null,
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

const sampleCartItem = {
  id: ITEM_ID,
  cartId: CART_ID,
  productVariantId: VARIANT_ID,
  quantity: 1,
  variant: {
    ...sampleVariant,
    product: { basePrice: 99.99 }, // for recalculate
  },
};

const emptyCart = {
  id: CART_ID,
  userId: "auth-user-id",
  sessionId: null,
  subtotal: 0,
  taxAmount: 0,
  shippingEstimate: 0,
  discountAmount: 0,
  grandTotal: 0,
  lastActivityAt: new Date(),
  createdAt: new Date(),
};

const cartWithItems = {
  ...emptyCart,
  subtotal: 99.99,
  taxAmount: 14.9985,
  shippingEstimate: 30,
  grandTotal: 144.9885,
  items: [
    {
      id: ITEM_ID,
      cartId: CART_ID,
      productVariantId: VARIANT_ID,
      quantity: 1,
      unitPriceAtAddition: 99.99,
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

describe("Cart API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Get Cart ──────────────────────────────────────────────────────────────

  describe("GET /api/v1/cart", () => {
    it("returns cart data for authenticated user", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...emptyCart,
        items: [],
      } as any);

      const res = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(CART_ID);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it("returns cart data for guest user with session cookie", async () => {
      const guestCart = { ...emptyCart, userId: null, sessionId: "guest-session-id" };
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce(guestCart as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...guestCart,
        items: [],
      } as any);

      const res = await request(app)
        .get("/api/v1/cart")
        .set("Cookie", GUEST_COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // ─── Add Item ──────────────────────────────────────────────────────────────

  describe("POST /api/v1/cart/items", () => {
    it("adds item and returns updated cart", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce(null); // no existing item
      vi.mocked(prisma.cartItem.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([
        {
          quantity: 1,
          variant: sampleVariant,
        },
      ] as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce(cartWithItems as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems as any);

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", AUTH_HEADER)
        .send({ productVariantId: VARIANT_ID, quantity: 1 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it("increments quantity when adding same variant", async () => {
      const existingItem = {
        id: ITEM_ID,
        cartId: CART_ID,
        productVariantId: VARIANT_ID,
        quantity: 1,
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce(existingItem as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([
        { quantity: 2, variant: sampleVariant },
      ] as any);
      vi.mocked(prisma.cart.update).mockResolvedValueOnce(cartWithItems as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems as any);

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", AUTH_HEADER)
        .send({ productVariantId: VARIANT_ID, quantity: 1 });

      expect(res.status).toBe(201);
      expect(vi.mocked(prisma.cartItem.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantity: 2 },
        })
      );
    });

    it("returns 400 when quantity exceeds stock", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", AUTH_HEADER)
        .send({ productVariantId: VARIANT_ID, quantity: 100 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Update & Delete Quantity ───────────────────────────────────────────────

  describe("PATCH /api/v1/cart/items/:itemId", () => {
    it("validates quantity parameter", async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);

      const res = await request(app)
        .patch(`/api/v1/cart/items/${ITEM_ID}`)
        .set("Authorization", AUTH_HEADER)
        .send({ quantity: -1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/v1/cart/items/:itemId", () => {
    it("returns 404 for non-existent item", async () => {
      // Get/create cart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);
      // Item not found
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .delete(`/api/v1/cart/items/${ITEM_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Merge Carts ───────────────────────────────────────────────────────────

  describe("POST /api/v1/cart/merge", () => {
    it("returns 401 without authentication", async () => {
      const res = await request(app).post("/api/v1/cart/merge");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
