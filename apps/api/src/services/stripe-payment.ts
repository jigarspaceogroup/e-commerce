import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { AppError, notFound, unauthorized } from "../middleware/error-handler.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

const STRIPE_ERROR_MAP: Record<string, string> = {
  card_declined: "Your card was declined. Please try another card.",
  expired_card: "Your card has expired.",
  insufficient_funds: "Insufficient funds.",
  processing_error: "An error occurred processing your card. Please try again.",
};

export function mapStripeError(code?: string): string {
  return STRIPE_ERROR_MAP[code ?? ""] ?? "Payment failed. Please try again or use a different payment method.";
}

export async function createPaymentIntent(
  orderId: string,
  amount: number, // in SAR
  currency: string,
  idempotencyKey: string,
) {
  const amountInHalalas = Math.round(amount * 100);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountInHalalas,
      currency: currency.toLowerCase(),
      metadata: { orderId, idempotencyKey },
      capture_method: "automatic",
    },
    { idempotencyKey },
  );

  const payment = await prisma.payment.create({
    data: {
      orderId,
      paymentMethod: "credit_card",
      gatewayTransactionId: paymentIntent.id,
      amount,
      currency: currency.toUpperCase(),
      status: "pending",
      idempotencyKey,
    },
  });

  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      eventType: "initiated",
      eventData: { paymentIntentId: paymentIntent.id, status: paymentIntent.status },
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentId: payment.id,
  };
}

export async function getPaymentStatus(paymentId: string, userId?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { userId: true, guestEmail: true } } },
  });
  if (!payment) throw notFound("Payment not found");

  if (userId && payment.order.userId !== userId) {
    throw unauthorized("Not authorized to view this payment");
  }

  return {
    id: payment.id,
    status: payment.status,
    orderId: payment.orderId,
  };
}

export async function handleWebhookEvent(rawBody: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  // Idempotency: check for duplicate event
  const existingEvent = await prisma.paymentEvent.findFirst({
    where: { gatewayEventId: event.id },
  });
  if (existingEvent) return { received: true, duplicate: true };

  // Resolve gatewayTransactionId from event object
  let gatewayTransactionId: string;
  if (event.type.startsWith("payment_intent.")) {
    gatewayTransactionId = (event.data.object as Stripe.PaymentIntent).id;
  } else if (event.type.startsWith("charge.")) {
    const charge = event.data.object as Stripe.Charge;
    gatewayTransactionId = (charge.payment_intent as string) ?? charge.id;
  } else {
    console.info(`Webhook: unhandled event type ${event.type}`);
    return { received: true };
  }

  const payment = await prisma.payment.findFirst({
    where: { gatewayTransactionId },
    include: { order: { include: { items: true } } },
  });

  if (!payment) {
    console.warn(`Webhook: no payment found for gateway ID ${gatewayTransactionId}`);
    return { received: true };
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "captured", gatewayResponse: event.data.object as any },
      });
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "payment_confirmed" },
      });
      await prisma.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: "pending_payment",
          toStatus: "payment_confirmed",
          notes: "Payment captured via Stripe webhook",
        },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed", gatewayResponse: event.data.object as any },
      });
      if (payment.order) {
        for (const item of payment.order.items) {
          await prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "cancelled" },
        });
        await prisma.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: "pending_payment",
            toStatus: "cancelled",
            notes: "Payment failed — stock released",
          },
        });
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const refundAmount = (charge.amount_refunded ?? 0) / 100;
      const isFullRefund = charge.refunded;
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: isFullRefund ? "refunded" : "partially_refunded", refundAmount },
      });
      if (isFullRefund) {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "refunded" },
        });
      }
      break;
    }

    case "charge.dispute.created": {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { notes: `DISPUTE: ${event.id} — flagged for admin review` },
      });
      break;
    }

    default:
      console.info(`Webhook: unhandled event type ${event.type}`);
  }

  // Log the event
  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      eventType: event.type,
      gatewayEventId: event.id,
      eventData: event.data.object as any,
    },
  });

  return { received: true };
}
