import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate, requirePermission } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validation.js";
import { updateStockSchema, inventoryListQuery } from "../../../schemas/inventory.js";
import { listInventory, updateStock, getInventorySummary } from "../../../services/inventory.js";
import { recordAuditLog } from "../../../services/audit-log.js";
import { sendSuccess, sendPaginated } from "../../../utils/response.js";

const adminInventoryRouter: IRouter = Router();

adminInventoryRouter.use(authenticate);

// GET /admin/inventory/summary
adminInventoryRouter.get(
  "/summary",
  requirePermission("inventory:read"),
  async (_req: Request, res: Response) => {
    const summary = await getInventorySummary();
    sendSuccess(res, summary);
  },
);

// GET /admin/inventory
adminInventoryRouter.get(
  "/",
  requirePermission("inventory:read"),
  validate({ query: inventoryListQuery }),
  async (req: Request, res: Response) => {
    const result = await listInventory(req.query as Record<string, unknown>);
    sendPaginated(res, result.data, {
      cursor: result.nextCursor,
      hasMore: result.hasMore,
      limit: Number(req.query.limit) || 20,
    });
  },
);

// GET /admin/inventory/low-stock
adminInventoryRouter.get(
  "/low-stock",
  requirePermission("inventory:read"),
  async (req: Request, res: Response) => {
    const result = await listInventory({ ...req.query as Record<string, unknown>, status: "low_stock" });
    sendPaginated(res, result.data, {
      cursor: result.nextCursor,
      hasMore: result.hasMore,
      limit: Number(req.query.limit) || 20,
    });
  },
);

// PATCH /admin/inventory/:variantId
adminInventoryRouter.patch(
  "/:variantId",
  requirePermission("inventory:update"),
  validate({ body: updateStockSchema }),
  async (req: Request, res: Response) => {
    const variantId = req.params.variantId as string;
    const { stockQuantity, reason, notes } = req.body;
    const updated = await updateStock(variantId, stockQuantity, reason, req.user!.sub, notes);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "stock_update",
      entityType: "product_variant",
      entityId: variantId,
      afterValue: { stockQuantity, reason, notes },
    });
    sendSuccess(res, updated);
  },
);

export { adminInventoryRouter };
