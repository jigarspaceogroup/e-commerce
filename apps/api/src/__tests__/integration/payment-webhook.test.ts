import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type Stripe from "stripe";

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
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
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

// Use vi.hoisted to ensure these are available in the mock factory
const { mockPaymentIntents, mockWebhooks } = vi.hoisted(() => ({
  mockPaymentIntents: { create: vi.fn() },
  mockWebhooks: { constructEvent: vi.fn() },
}));

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      paymentIntents = mockPaymentIntents;
      webhooks = mockWebhooks;
    },
  };
});

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    productVariant: {
      update: vi.fn(),
    },
  },
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const AUTH_HEADER = "Bearer valid-token";
const ORDER_ID = "aa0e8400-e29b-41d4-a716-446655440000";
const PAYMENT_ID = "bb0e8400-e29b-41d4-a716-446655440001";
const PAYMENT_INTENT_ID = "pi_test_123";

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
  shippingAddressId: "ff0e8400-e29b-41d4-a716-446655440005",
  idempotencyKey: "110e8400-e29b-41d4-a716-446655440006",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: "order-item-1",
      orderId: ORDER_ID,
      productVariantId: "330e8400-e29b-41d4-a716-446655440007",
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
  payments: [],
  statusHistory: [],
};

const samplePayment = {
  id: PAYMENT_ID,
  orderId: ORDER_ID,
  paymentMethod: "credit_card",
  gatewayTransactionId: PAYMENT_INTENT_ID,
  amount: 144.9885,
  currency: "SAR",
  status: "pending",
  idempotencyKey: "cc0e8400-e29b-41d4-a716-446655440002",
  refundAmount: null,
  gatewayResponse: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  order: sampleOrder,
};

describe("Payment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /api/v1/payments/initiate ──────────────────────────────────────

  describe("POST /api/v1/payments/initiate", () => {
    it("creates payment intent and returns client secret", async () => {
      const mockPaymentIntent = {
        id: PAYMENT_INTENT_ID,
        client_secret: "pi_test_123_secret_xyz",
        amount: 14499,
        currency: "sar",
        status: "requires_payment_method",
      };

      mockPaymentIntents.create.mockResolvedValueOnce(mockPaymentIntent as any);

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(sampleOrder as any);
      vi.mocked(prisma.payment.create).mockResolvedValueOnce(samplePayment as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/v1/payments/initiate")
        .set("Authorization", AUTH_HEADER)
        .send({
          orderId: ORDER_ID,
          idempotencyKey: "cc0e8400-e29b-41d4-a716-446655440002",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clientSecret).toBe("pi_test_123_secret_xyz");
      expect(res.body.data.paymentId).toBe(PAYMENT_ID);
    });

    it("returns 404 when order not found", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/payments/initiate")
        .set("Authorization", AUTH_HEADER)
        .send({
          orderId: "220e8400-e29b-41d4-a716-446655440099", // Valid UUID but non-existent
          idempotencyKey: "dd0e8400-e29b-41d4-a716-446655440003",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when user tries to pay for another user's order", async () => {
      const otherUserOrder = {
        ...sampleOrder,
        userId: "other-user-id",
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(otherUserOrder as any);

      const res = await request(app)
        .post("/api/v1/payments/initiate")
        .set("Authorization", AUTH_HEADER)
        .send({
          orderId: ORDER_ID,
          idempotencyKey: "ee0e8400-e29b-41d4-a716-446655440004",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/v1/payments/:id/status ──────────────────────────────────────

  describe("GET /api/v1/payments/:id/status", () => {
    it("returns payment status for authorized user", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(samplePayment as any);

      const res = await request(app)
        .get(`/api/v1/payments/${PAYMENT_ID}/status`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(PAYMENT_ID);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.orderId).toBe(ORDER_ID);
    });

    it("returns 404 for non-existent payment", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .get("/api/v1/payments/non-existent-id/status")
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when user tries to access another user's payment", async () => {
      const otherUserPayment = {
        ...samplePayment,
        order: {
          ...sampleOrder,
          userId: "other-user-id",
        },
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(otherUserPayment as any);

      const res = await request(app)
        .get(`/api/v1/payments/${PAYMENT_ID}/status`)
        .set("Authorization", AUTH_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/v1/payments/webhook ───────────────────────────────────────

  describe("POST /api/v1/payments/webhook", () => {
    it("handles payment_intent.succeeded event", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: PAYMENT_INTENT_ID,
            object: "payment_intent",
            amount: 14499,
            currency: "sar",
            status: "succeeded",
          } as Stripe.PaymentIntent,
        },
        api_version: "2023-10-16",
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      };

      mockWebhooks.constructEvent.mockReturnValueOnce(mockEvent);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null); // Not duplicate
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(samplePayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));

      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("stripe-signature", "t=123,v1=abc")
        .set("Content-Type", "application/json")
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: PAYMENT_ID },
        data: { status: "captured", gatewayResponse: expect.any(Object) },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: "payment_confirmed" },
      });
    });

    it("returns 400 for missing stripe-signature header", async () => {
      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("Content-Type", "application/json")
        .send(Buffer.from("{}"));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("stripe-signature");
    });

    it("returns 400 for invalid signature", async () => {
      mockWebhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error("Invalid signature");
      });

      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("stripe-signature", "invalid-signature")
        .set("Content-Type", "application/json")
        .send(Buffer.from("{}"));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("handles duplicate webhook events (idempotency)", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_duplicate_123",
        object: "event",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: PAYMENT_INTENT_ID,
            object: "payment_intent",
            amount: 14499,
            currency: "sar",
            status: "succeeded",
          } as Stripe.PaymentIntent,
        },
        api_version: "2023-10-16",
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      };

      mockWebhooks.constructEvent.mockReturnValueOnce(mockEvent);
      // Mock existing event found (duplicate)
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce({
        id: "existing-event",
        gatewayEventId: "evt_duplicate_123",
      } as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));

      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("stripe-signature", "t=123,v1=abc")
        .set("Content-Type", "application/json")
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(res.body.duplicate).toBe(true);
      // Should not process duplicate event
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("handles payment_intent.payment_failed event and restores stock", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_failed_123",
        object: "event",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: PAYMENT_INTENT_ID,
            object: "payment_intent",
            amount: 14499,
            currency: "sar",
            status: "requires_payment_method",
            last_payment_error: {
              code: "card_declined",
              message: "Your card was declined",
            },
          } as Stripe.PaymentIntent,
        },
        api_version: "2023-10-16",
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      };

      mockWebhooks.constructEvent.mockReturnValueOnce(mockEvent);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(samplePayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));

      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("stripe-signature", "t=123,v1=abc")
        .set("Content-Type", "application/json")
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: PAYMENT_ID },
        data: { status: "failed", gatewayResponse: expect.any(Object) },
      });
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: "330e8400-e29b-41d4-a716-446655440007" },
        data: { stockQuantity: { increment: 1 } },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: "cancelled" },
      });
    });

    it("handles charge.refunded event", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_refund_123",
        object: "event",
        type: "charge.refunded",
        data: {
          object: {
            id: "ch_test_123",
            object: "charge",
            amount: 14499,
            currency: "sar",
            payment_intent: PAYMENT_INTENT_ID,
            refunded: true,
            amount_refunded: 14499,
          } as Stripe.Charge,
        },
        api_version: "2023-10-16",
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      };

      mockWebhooks.constructEvent.mockReturnValueOnce(mockEvent);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(samplePayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));

      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("stripe-signature", "t=123,v1=abc")
        .set("Content-Type", "application/json")
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: PAYMENT_ID },
        data: { status: "refunded", refundAmount: 144.99 },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: "refunded" },
      });
    });
  });

  // ─── GET /api/v1/payments/methods ──────────────────────────────────────────

  describe("GET /api/v1/payments/methods", () => {
    it("returns available payment methods", async () => {
      const res = await request(app).get("/api/v1/payments/methods");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(["credit_card"]);
    });
  });
});
