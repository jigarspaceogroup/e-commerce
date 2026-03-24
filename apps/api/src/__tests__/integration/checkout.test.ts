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
    incr: vi.fn().mockResolvedValue(1),
    expireat: vi.fn(),
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
    $transaction: vi.fn(),
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
      deleteMany: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    address: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";
const GUEST_COOKIE = "cart_session=guest-session-id";

const CART_ID = "550e8400-e29b-41d4-a716-446655440000";
const ORDER_ID = "660e8400-e29b-41d4-a716-446655440000";
const VARIANT_ID = "770e8400-e29b-41d4-a716-446655440001";
const PRODUCT_ID = "880e8400-e29b-41d4-a716-446655440001";
const ADDRESS_ID = "990e8400-e29b-41d4-a716-446655440001";

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

const cartWithItems = {
  id: CART_ID,
  userId: "auth-user-id",
  sessionId: null,
  subtotal: 99.99,
  taxAmount: 14.9985,
  shippingEstimate: 30,
  discountAmount: 0,
  grandTotal: 144.9885,
  lastActivityAt: new Date(),
  createdAt: new Date(),
  items: [
    {
      id: "item-1",
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

const sampleAddress = {
  id: ADDRESS_ID,
  userId: "auth-user-id",
  recipientName: "John Doe",
  streetLine1: "123 Main St",
  streetLine2: null,
  city: "Riyadh",
  region: "Riyadh",
  postalCode: "12345",
  country: "SA",
  phone: "+966501234567",
  deliveryInstructions: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleOrder = {
  id: ORDER_ID,
  orderNumber: "ORD-20260323-00001",
  userId: "auth-user-id",
  guestEmail: null,
  status: "pending_payment",
  subtotal: 99.99,
  taxAmount: 14.9985,
  shippingCost: 30,
  discountAmount: 0,
  grandTotal: 144.9885,
  currency: "SAR",
  shippingAddressId: ADDRESS_ID,
  idempotencyKey: "aa0e8400-e29b-41d4-a716-446655440001",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: "order-item-1",
      orderId: ORDER_ID,
      productVariantId: VARIANT_ID,
      quantity: 1,
      unitPrice: 99.99,
      subtotal: 99.99,
      taxAmount: 14.9985,
      titleSnapshot: "Test Product",
      skuSnapshot: "TEST-001",
      attributesSnapshot: { size: "M" },
      imageSnapshot: "https://example.com/image.jpg",
      createdAt: new Date(),
    },
  ],
  shippingAddress: sampleAddress,
  payments: [],
  statusHistory: [],
};

describe("Checkout API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /api/v1/checkout ──────────────────────────────────────────────

  describe("POST /api/v1/checkout", () => {
    it("creates order with valid cart and shipping address", async () => {
      // Mock getOrCreateCart - returns basic cart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...cartWithItems,
        items: undefined as any,
      } as any);

      // Mock createOrder cart lookup - returns cart WITH items
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems as any);

      // Mock no existing order (idempotency check)
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

      // Mock variant stock check (for each item in cart)
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);

      // Mock address lookup (getAddress uses findFirst)
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(sampleAddress as any);

      // Mock transaction - we need to mock the nested calls
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        // Execute the callback with a mock transaction object
        const mockTx = {
          order: {
            create: vi.fn().mockResolvedValue(sampleOrder),
          },
          orderItem: {
            create: vi.fn().mockResolvedValue({}),
          },
          productVariant: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          orderStatusHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
          cartItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
          },
          cart: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      // Mock the final order lookup after transaction
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(sampleOrder as any);

      const res = await request(app)
        .post("/api/v1/checkout")
        .set("Authorization", AUTH_HEADER)
        .send({
          shippingAddressId: ADDRESS_ID,
          idempotencyKey: "aa0e8400-e29b-41d4-a716-446655440001",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.orderNumber).toBe("ORD-20260323-00001");
      expect(res.body.data.status).toBe("pending_payment");
    });

    it("returns 400 CART_EMPTY for empty cart", async () => {
      const emptyCart = {
        ...cartWithItems,
        items: [],
        subtotal: 0,
        grandTotal: 0,
      };

      // Mock getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...emptyCart,
        items: undefined as any,
      } as any);

      // Mock createOrder cart lookup
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(emptyCart as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/checkout")
        .set("Authorization", AUTH_HEADER)
        .send({
          shippingAddressId: ADDRESS_ID,
          idempotencyKey: "bb0e8400-e29b-41d4-a716-446655440002",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CART_EMPTY");
    });

    it("supports guest checkout with guestEmail and shipping address", async () => {
      const guestCart = {
        ...cartWithItems,
        userId: null,
        sessionId: "guest-session-id",
      };

      const guestOrder = {
        ...sampleOrder,
        userId: null,
        guestEmail: "guest@example.com",
      };

      // Mock getOrCreateCart for guest
      vi.mocked(prisma.cart.findFirst).mockResolvedValueOnce({
        ...guestCart,
        items: undefined as any,
      } as any);

      // Mock createOrder cart lookup
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(guestCart as any);

      // Mock no existing order
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

      // Mock variant stock check
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(sampleVariant as any);

      // Mock transaction
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          order: { create: vi.fn().mockResolvedValue(guestOrder) },
          orderItem: { create: vi.fn().mockResolvedValue({}) },
          productVariant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
          cartItem: { deleteMany: vi.fn().mockResolvedValue({}) },
          cart: { update: vi.fn().mockResolvedValue({}) },
        };
        return callback(mockTx);
      });

      // Mock final order lookup
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(guestOrder as any);

      const res = await request(app)
        .post("/api/v1/checkout")
        .set("Cookie", GUEST_COOKIE)
        .send({
          guestEmail: "guest@example.com",
          shippingAddress: {
            recipientName: "Guest User",
            streetLine1: "456 Guest St",
            city: "Jeddah",
            region: "Makkah",
            postalCode: "54321",
            country: "SA",
            phone: "+966509876543",
          },
          idempotencyKey: "cc0e8400-e29b-41d4-a716-446655440003",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeNull();
      expect(res.body.data.guestEmail).toBe("guest@example.com");
    });

    it("returns same order for duplicate idempotency key", async () => {
      // Mock getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...cartWithItems,
        items: undefined as any,
      } as any);

      // Mock existing order found (idempotency check returns existing order)
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(sampleOrder as any);

      const res = await request(app)
        .post("/api/v1/checkout")
        .set("Authorization", AUTH_HEADER)
        .send({
          shippingAddressId: ADDRESS_ID,
          idempotencyKey: "aa0e8400-e29b-41d4-a716-446655440001", // Same key as first test
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ORDER_ID);
      // Should not create a new order
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("returns 409 STOCK_INSUFFICIENT when stock is unavailable", async () => {
      const insufficientVariant = {
        ...sampleVariant,
        stockQuantity: 0, // Out of stock
      };

      // Mock getOrCreateCart
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        ...cartWithItems,
        items: undefined as any,
      } as any);

      // Mock createOrder cart lookup
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems as any);

      // Mock no existing order
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

      // Mock variant with insufficient stock
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(insufficientVariant as any);

      // Mock address (getAddress uses findFirst)
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(sampleAddress as any);

      const res = await request(app)
        .post("/api/v1/checkout")
        .set("Authorization", AUTH_HEADER)
        .send({
          shippingAddressId: ADDRESS_ID,
          idempotencyKey: "dd0e8400-e29b-41d4-a716-446655440004",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("STOCK_INSUFFICIENT");
    });
  });

  // ─── GET /api/v1/orders ──────────────────────────────────────────────────

  describe("GET /api/v1/orders", () => {
    it("returns paginated list of orders for authenticated user", async () => {
      const orders = [
        {
          id: ORDER_ID,
          orderNumber: "ORD-20260323-00001",
          status: "pending_payment",
          grandTotal: 144.9885,
          createdAt: new Date(),
        },
        {
          id: "order-789",
          orderNumber: "ORD-20260322-00001",
          status: "delivered",
          grandTotal: 299.99,
          createdAt: new Date(Date.now() - 86400000),
        },
      ];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders as any);

      const res = await request(app)
        .get("/api/v1/orders")
        .set("Authorization", AUTH_HEADER)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].orderNumber).toBe("ORD-20260323-00001");
    });

    it("supports cursor-based pagination", async () => {
      const orders = [
        {
          id: "order-new",
          orderNumber: "ORD-20260323-00002",
          status: "pending_payment",
          grandTotal: 99.99,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders as any);

      const res = await request(app)
        .get("/api/v1/orders")
        .set("Authorization", AUTH_HEADER)
        .query({ cursor: ORDER_ID, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/v1/orders");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/v1/orders/:id ──────────────────────────────────────────────

  describe("GET /api/v1/orders/:id", () => {
    it("returns full order detail for authenticated user", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(sampleOrder as any);

      const res = await request(app)
        .get(`/api/v1/orders/${ORDER_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ORDER_ID);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.shippingAddress).toBeDefined();
    });

    it("supports guest access with email query param", async () => {
      const guestOrder = {
        ...sampleOrder,
        userId: null,
        guestEmail: "guest@example.com",
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(guestOrder as any);

      const res = await request(app)
        .get(`/api/v1/orders/${ORDER_ID}`)
        .query({ email: "guest@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.guestEmail).toBe("guest@example.com");
    });

    it("returns 404 for non-existent order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .get("/api/v1/orders/non-existent-id")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when user tries to access another user's order", async () => {
      const otherUserOrder = {
        ...sampleOrder,
        userId: "other-user-id",
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(otherUserOrder as any);

      const res = await request(app)
        .get(`/api/v1/orders/${ORDER_ID}`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
