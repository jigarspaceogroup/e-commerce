import { Router, type IRouter } from "express";
import { cartSession } from "../../middleware/session.js";
import { getOrCreateCart } from "../../services/cart.js";
import { checkoutSchema, createOrder } from "../../services/checkout.js";

export const checkoutRouter: IRouter = Router();

// POST /api/v1/checkout
checkoutRouter.post("/", cartSession, async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body);
    const cart = await getOrCreateCart(req.cartUserId, req.cartSessionId);
    const order = await createOrder(cart.id, req.cartUserId, input);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});
