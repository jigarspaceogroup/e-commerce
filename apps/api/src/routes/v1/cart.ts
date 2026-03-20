import { Router, type IRouter } from "express";
import { z } from "zod";
import { cartSession } from "../../middleware/session.js";
import { authenticate } from "../../middleware/auth.js";
import {
  getOrCreateCart,
  getCartWithDetails,
  formatCartResponse,
  addItem,
  updateItemQuantity,
  removeItem,
  mergeCarts,
} from "../../services/cart.js";

export const cartRouter: IRouter = Router();

const addItemSchema = z.object({
  productVariantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

// All cart routes use session middleware
cartRouter.use(cartSession);

// GET /api/v1/cart
cartRouter.get("/", async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.cartUserId, req.cartSessionId);
    const detailed = await getCartWithDetails(cart.id);
    res.json({ success: true, data: formatCartResponse(detailed) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/cart/items
cartRouter.post("/items", async (req, res, next) => {
  try {
    const { productVariantId, quantity } = addItemSchema.parse(req.body);
    const cart = await getOrCreateCart(req.cartUserId, req.cartSessionId);
    await addItem(cart.id, productVariantId, quantity);
    const detailed = await getCartWithDetails(cart.id);
    res.status(201).json({ success: true, data: formatCartResponse(detailed) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/cart/items/:itemId
cartRouter.patch("/items/:itemId", async (req, res, next) => {
  try {
    const { quantity } = updateQuantitySchema.parse(req.body);
    const cart = await getOrCreateCart(req.cartUserId, req.cartSessionId);
    await updateItemQuantity(cart.id, req.params.itemId, quantity);
    const detailed = await getCartWithDetails(cart.id);
    res.json({ success: true, data: formatCartResponse(detailed) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/cart/items/:itemId
cartRouter.delete("/items/:itemId", async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.cartUserId, req.cartSessionId);
    await removeItem(cart.id, req.params.itemId);
    const detailed = await getCartWithDetails(cart.id);
    res.json({ success: true, data: formatCartResponse(detailed) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/cart/merge — requires auth
cartRouter.post("/merge", authenticate, async (req, res, next) => {
  try {
    const sessionId = req.cookies?.cart_session;
    if (!sessionId) {
      res.json({ success: true, data: null });
      return;
    }
    await mergeCarts(req.user!.sub, sessionId);
    res.clearCookie("cart_session");
    const cart = await getOrCreateCart(req.user!.sub);
    const detailed = await getCartWithDetails(cart.id);
    res.json({ success: true, data: formatCartResponse(detailed) });
  } catch (err) {
    next(err);
  }
});
