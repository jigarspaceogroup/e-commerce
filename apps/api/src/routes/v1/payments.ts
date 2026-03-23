import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { z } from "zod";
import { cartSession } from "../../middleware/session.js";
import {
  createPaymentIntent,
  getPaymentStatus,
  handleWebhookEvent,
} from "../../services/stripe-payment.js";
import { getOrder } from "../../services/order.js";

export const paymentsRouter: IRouter = Router();

const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

// POST /api/v1/payments/initiate
paymentsRouter.post("/initiate", cartSession, async (req, res, next) => {
  try {
    const { orderId, idempotencyKey } = initiatePaymentSchema.parse(req.body);

    // Verify order ownership
    const order = await getOrder(orderId, req.cartUserId, undefined);

    // Create payment intent
    const result = await createPaymentIntent(
      orderId,
      Number(order.grandTotal),
      order.currency,
      idempotencyKey,
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payments/:id/status
paymentsRouter.get("/:id/status", cartSession, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await getPaymentStatus(id, req.cartUserId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payments/methods — public endpoint
paymentsRouter.get("/methods", (req, res) => {
  res.json({ success: true, data: ["credit_card"] });
});

// POST /api/v1/payments/webhook — Stripe webhook
// CRITICAL: This route needs raw body (Buffer) for signature verification
paymentsRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        res.status(400).json({ success: false, error: "Missing stripe-signature header" });
        return;
      }

      const rawBody = req.body as Buffer;
      const result = await handleWebhookEvent(rawBody, signature as string);
      res.json(result);
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);
