import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import {
  createPaymentIntent,
  getPaymentStatus,
  handleWebhookEvent,
  mapStripeError,
} from "../../services/stripe-payment.js";

// Mock Stripe
const mockPaymentIntentsCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  // Access the outer scope mocks via a closure
  const paymentIntentsFn = (...args: any[]) => mockPaymentIntentsCreate(...args);
  const webhooksConstructFn = (...args: any[]) => mockWebhooksConstructEvent(...args);

  return {
    default: class MockStripe {
      paymentIntents = {
        create: paymentIntentsFn,
      };
      webhooks = {
        constructEvent: webhooksConstructFn,
      };
    },
  };
});

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    paymentEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    order: {
      update: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    productVariant: {
      update: vi.fn(),
    },
  },
}));

describe("Stripe Payment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value
    mockPaymentIntentsCreate.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "cs_test_secret",
      status: "requires_payment_method",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createPaymentIntent", () => {
    it("creates PaymentIntent with correct amount in halalas, creates Payment record, logs PaymentEvent", async () => {
      const mockPayment = {
        id: "payment-123",
        orderId: "order-123",
        paymentMethod: "credit_card",
        gatewayTransactionId: "pi_test_123",
        amount: 150.5,
        currency: "SAR",
        status: "pending",
        idempotencyKey: "idem-key-123",
      };

      vi.mocked(prisma.payment.create).mockResolvedValueOnce(mockPayment as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const result = await createPaymentIntent(
        "order-123",
        150.5,
        "SAR",
        "idem-key-123",
      );

      // Verify Stripe API called with amount in halalas (150.5 SAR = 15050 halalas)
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        {
          amount: 15050,
          currency: "sar",
          metadata: { orderId: "order-123", idempotencyKey: "idem-key-123" },
          capture_method: "automatic",
        },
        { idempotencyKey: "idem-key-123" },
      );

      // Verify Payment record created
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-123",
          paymentMethod: "credit_card",
          gatewayTransactionId: "pi_test_123",
          amount: 150.5,
          currency: "SAR",
          status: "pending",
          idempotencyKey: "idem-key-123",
        },
      });

      // Verify PaymentEvent logged
      expect(prisma.paymentEvent.create).toHaveBeenCalledWith({
        data: {
          paymentId: "payment-123",
          eventType: "initiated",
          eventData: {
            paymentIntentId: "pi_test_123",
            status: "requires_payment_method",
          },
        },
      });

      // Verify return value
      expect(result).toEqual({
        clientSecret: "cs_test_secret",
        paymentId: "payment-123",
      });
    });

    it("converts SAR to halalas correctly (150.50 SAR = 15050)", async () => {
      vi.mocked(prisma.payment.create).mockResolvedValueOnce({
        id: "payment-123",
      } as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      await createPaymentIntent("order-123", 150.5, "SAR", "idem-key-123");

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 15050 }),
        expect.any(Object),
      );
    });

    it("forwards idempotencyKey to Stripe API", async () => {
      vi.mocked(prisma.payment.create).mockResolvedValueOnce({
        id: "payment-123",
      } as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      await createPaymentIntent("order-123", 100, "SAR", "unique-key-456");

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: "unique-key-456" },
      );
    });
  });

  describe("getPaymentStatus", () => {
    it("returns payment status with ownership check", async () => {
      const mockPayment = {
        id: "payment-123",
        status: "captured",
        orderId: "order-123",
        order: {
          userId: "user-123",
          guestEmail: null,
        },
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(
        mockPayment as any,
      );

      const result = await getPaymentStatus("payment-123", "user-123");

      expect(result).toEqual({
        id: "payment-123",
        status: "captured",
        orderId: "order-123",
      });
    });

    it("throws notFound when payment does not exist", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(null);

      await expect(getPaymentStatus("payment-999", "user-123")).rejects.toThrow(
        "Payment not found",
      );
    });

    it("throws unauthorized when userId does not match order owner", async () => {
      const mockPayment = {
        id: "payment-123",
        status: "captured",
        orderId: "order-123",
        order: {
          userId: "user-123",
          guestEmail: null,
        },
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(
        mockPayment as any,
      );

      await expect(
        getPaymentStatus("payment-123", "user-different"),
      ).rejects.toThrow("Not authorized to view this payment");
    });
  });

  describe("handleWebhookEvent", () => {
    it("payment_intent.succeeded: updates Payment to captured, Order to payment_confirmed, logs PaymentEvent with gatewayEventId", async () => {
      const mockEvent = {
        id: "evt_test_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_123",
            status: "succeeded",
          },
        },
      };

      const mockPayment = {
        id: "payment-123",
        orderId: "order-123",
        gatewayTransactionId: "pi_test_123",
        order: {
          id: "order-123",
          items: [],
        },
      };

      mockWebhooksConstructEvent.mockReturnValueOnce(mockEvent as any);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(
        mockPayment as any,
      );
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce(
        {} as any,
      );
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const rawBody = Buffer.from("webhook-payload");
      const signature = "test-signature";

      const result = await handleWebhookEvent(rawBody, signature);

      // Verify webhook signature verification
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        "",
      );

      // Verify duplicate check
      expect(prisma.paymentEvent.findFirst).toHaveBeenCalledWith({
        where: { gatewayEventId: "evt_test_123" },
      });

      // Verify payment updated to captured
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-123" },
        data: {
          status: "captured",
          gatewayResponse: mockEvent.data.object,
        },
      });

      // Verify order status updated
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-123" },
        data: { status: "payment_confirmed" },
      });

      // Verify status history created
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-123",
          fromStatus: "pending_payment",
          toStatus: "payment_confirmed",
          notes: "Payment captured via Stripe webhook",
        },
      });

      // Verify event logged with gatewayEventId
      expect(prisma.paymentEvent.create).toHaveBeenCalledWith({
        data: {
          paymentId: "payment-123",
          eventType: "payment_intent.succeeded",
          gatewayEventId: "evt_test_123",
          eventData: mockEvent.data.object,
        },
      });

      expect(result).toEqual({ received: true });
    });

    it("payment_intent.payment_failed: updates Payment to failed, restores stock, cancels order", async () => {
      const mockEvent = {
        id: "evt_test_456",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_test_456",
            status: "failed",
          },
        },
      };

      const mockPayment = {
        id: "payment-456",
        orderId: "order-456",
        gatewayTransactionId: "pi_test_456",
        order: {
          id: "order-456",
          items: [
            { id: "item-1", productVariantId: "variant-1", quantity: 2 },
            { id: "item-2", productVariantId: "variant-2", quantity: 1 },
          ],
        },
      };

      mockWebhooksConstructEvent.mockReturnValueOnce(mockEvent as any);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(
        mockPayment as any,
      );
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValue({} as any);
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.orderStatusHistory.create).mockResolvedValueOnce(
        {} as any,
      );
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      const rawBody = Buffer.from("webhook-payload");
      const signature = "test-signature";

      await handleWebhookEvent(rawBody, signature);

      // Verify payment updated to failed
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-456" },
        data: {
          status: "failed",
          gatewayResponse: mockEvent.data.object,
        },
      });

      // Verify stock restored for each item
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: "variant-1" },
        data: { stockQuantity: { increment: 2 } },
      });
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: "variant-2" },
        data: { stockQuantity: { increment: 1 } },
      });

      // Verify order cancelled
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-456" },
        data: { status: "cancelled" },
      });

      // Verify status history
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-456",
          fromStatus: "pending_payment",
          toStatus: "cancelled",
          notes: "Payment failed — stock released",
        },
      });
    });

    it("duplicate gatewayEventId: returns early without reprocessing", async () => {
      const mockEvent = {
        id: "evt_duplicate_123",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_test_123" } },
      };

      mockWebhooksConstructEvent.mockReturnValueOnce(mockEvent as any);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce({
        id: "existing-event",
      } as any);

      const result = await handleWebhookEvent(
        Buffer.from("payload"),
        "signature",
      );

      expect(result).toEqual({ received: true, duplicate: true });

      // Verify no payment updates
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it("invalid signature: throws error", async () => {
      mockWebhooksConstructEvent.mockImplementationOnce(() => {
        throw new Error("Invalid signature");
      });

      await expect(
        handleWebhookEvent(Buffer.from("payload"), "bad-signature"),
      ).rejects.toThrow("Invalid signature");
    });

    it("unknown event type: logs and returns 200", async () => {
      const mockEvent = {
        id: "evt_unknown_123",
        type: "customer.created",
        data: { object: { id: "cus_123" } },
      };

      mockWebhooksConstructEvent.mockReturnValueOnce(mockEvent as any);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null);

      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      const result = await handleWebhookEvent(
        Buffer.from("payload"),
        "signature",
      );

      expect(result).toEqual({ received: true });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Webhook: unhandled event type customer.created",
      );

      consoleSpy.mockRestore();
    });

    it("charge.dispute.created: logs dispute info on order notes", async () => {
      const mockEvent = {
        id: "evt_dispute_123",
        type: "charge.dispute.created",
        data: {
          object: {
            id: "ch_test_123",
            payment_intent: "pi_test_123",
          },
        },
      };

      const mockPayment = {
        id: "payment-123",
        orderId: "order-123",
        gatewayTransactionId: "pi_test_123",
        order: {
          id: "order-123",
          items: [],
        },
      };

      mockWebhooksConstructEvent.mockReturnValueOnce(mockEvent as any);
      vi.mocked(prisma.paymentEvent.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(
        mockPayment as any,
      );
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.paymentEvent.create).mockResolvedValueOnce({} as any);

      await handleWebhookEvent(Buffer.from("payload"), "signature");

      // Verify order notes updated with dispute
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-123" },
        data: {
          notes: "DISPUTE: evt_dispute_123 — flagged for admin review",
        },
      });
    });
  });

  describe("mapStripeError", () => {
    it("maps known error codes to user-friendly messages", () => {
      expect(mapStripeError("card_declined")).toBe(
        "Your card was declined. Please try another card.",
      );
      expect(mapStripeError("expired_card")).toBe("Your card has expired.");
      expect(mapStripeError("insufficient_funds")).toBe("Insufficient funds.");
      expect(mapStripeError("processing_error")).toBe(
        "An error occurred processing your card. Please try again.",
      );
    });

    it("returns generic message for unknown error codes", () => {
      expect(mapStripeError("unknown_error")).toBe(
        "Payment failed. Please try again or use a different payment method.",
      );
      expect(mapStripeError()).toBe(
        "Payment failed. Please try again or use a different payment method.",
      );
    });
  });
});
