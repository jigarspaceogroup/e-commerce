import { Router, type IRouter } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { cartSession } from "../../middleware/session.js";
import { getOrder, listOrders } from "../../services/order.js";

export const ordersRouter: IRouter = Router();

const listOrdersSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.string().optional(),
});

// GET /api/v1/orders — authenticated users only
ordersRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const { cursor, limit, status } = listOrdersSchema.parse(req.query);
    const result = await listOrders(req.user!.sub, cursor, limit, status);
    res.json({ success: true, data: result.data, nextCursor: result.nextCursor });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:id — supports guest access via ?email= query param
ordersRouter.get("/:id", cartSession, async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.query.email as string | undefined;
    const order = await getOrder(id as string, req.cartUserId, email);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});
