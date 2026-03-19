import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate, requirePermission } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validation.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParam,
  categoryListQuery,
} from "../../../schemas/category.js";
import {
  createCategory,
  getCategoryById,
  listCategories,
  updateCategory,
  deleteCategory,
} from "../../../services/category.js";
import { recordAuditLog } from "../../../services/audit-log.js";
import { sendSuccess, sendCreated, sendNoContent } from "../../../utils/response.js";

const adminCategoryRouter: IRouter = Router();

adminCategoryRouter.use(authenticate);

// POST /admin/categories
adminCategoryRouter.post(
  "/",
  requirePermission("categories:create"),
  validate({ body: createCategorySchema }),
  async (req: Request, res: Response) => {
    const category = await createCategory(req.body);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "create",
      entityType: "category",
      entityId: category.id,
      afterValue: category,
    });
    sendCreated(res, category);
  },
);

// GET /admin/categories
adminCategoryRouter.get(
  "/",
  requirePermission("categories:read"),
  validate({ query: categoryListQuery }),
  async (req: Request, res: Response) => {
    const { format, includeInactive } = req.query as { format?: "flat" | "tree"; includeInactive?: boolean };
    const categories = await listCategories(format ?? "flat", !!includeInactive);
    sendSuccess(res, categories);
  },
);

// GET /admin/categories/:id
adminCategoryRouter.get(
  "/:id",
  requirePermission("categories:read"),
  validate({ params: categoryIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const category = await getCategoryById(id);
    sendSuccess(res, category);
  },
);

// PATCH /admin/categories/:id
adminCategoryRouter.patch(
  "/:id",
  requirePermission("categories:update"),
  validate({ params: categoryIdParam, body: updateCategorySchema }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { before, after } = await updateCategory(id, req.body);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "update",
      entityType: "category",
      entityId: id,
      beforeValue: before,
      afterValue: after,
    });
    sendSuccess(res, after);
  },
);

// DELETE /admin/categories/:id
adminCategoryRouter.delete(
  "/:id",
  requirePermission("categories:delete"),
  validate({ params: categoryIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const reassignTo = req.query.reassignTo as string | undefined;
    const deleted = await deleteCategory(id, reassignTo);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "delete",
      entityType: "category",
      entityId: id,
      beforeValue: deleted,
    });
    sendNoContent(res);
  },
);

export { adminCategoryRouter };
