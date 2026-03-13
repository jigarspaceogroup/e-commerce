import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { authenticate, requirePermission } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validation.js";
import { badRequest } from "../../../middleware/error-handler.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdParam,
  productListQuery,
  createVariantSchema,
  updateVariantSchema,
} from "../../../schemas/product.js";
import {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  publishProduct,
  archiveProduct,
  softDeleteProduct,
} from "../../../services/product.js";
import { createVariant, updateVariant, deleteVariant } from "../../../services/variant.js";
import { uploadProductImage, updateProductImage, deleteProductImage } from "../../../services/product-image.js";
import { recordAuditLog } from "../../../services/audit-log.js";
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from "../../../utils/response.js";

const adminProductRouter: IRouter = Router();

adminProductRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /admin/products
adminProductRouter.post(
  "/",
  requirePermission("products:create"),
  validate({ body: createProductSchema }),
  async (req: Request, res: Response) => {
    const product = await createProduct(req.body);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "create",
      entityType: "product",
      entityId: product.id,
      afterValue: product,
    });
    sendCreated(res, product);
  },
);

// GET /admin/products
adminProductRouter.get(
  "/",
  requirePermission("products:read"),
  validate({ query: productListQuery }),
  async (req: Request, res: Response) => {
    const result = await listProducts(req.query as Record<string, unknown>);
    sendPaginated(res, result.data, {
      cursor: result.nextCursor,
      hasMore: result.hasMore,
      limit: Number(req.query.limit) || 20,
    });
  },
);

// GET /admin/products/:id
adminProductRouter.get(
  "/:id",
  requirePermission("products:read"),
  validate({ params: productIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const product = await getProductById(id);
    sendSuccess(res, product);
  },
);

// PATCH /admin/products/:id
adminProductRouter.patch(
  "/:id",
  requirePermission("products:update"),
  validate({ params: productIdParam, body: updateProductSchema }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { before, after } = await updateProduct(id, req.body);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "update",
      entityType: "product",
      entityId: id,
      beforeValue: before,
      afterValue: after,
    });
    sendSuccess(res, after);
  },
);

// POST /admin/products/:id/publish
adminProductRouter.post(
  "/:id/publish",
  requirePermission("products:update"),
  validate({ params: productIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const product = await publishProduct(id);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "publish",
      entityType: "product",
      entityId: id,
      afterValue: product,
    });
    sendSuccess(res, product);
  },
);

// POST /admin/products/:id/archive
adminProductRouter.post(
  "/:id/archive",
  requirePermission("products:update"),
  validate({ params: productIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const product = await archiveProduct(id);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "archive",
      entityType: "product",
      entityId: id,
      afterValue: product,
    });
    sendSuccess(res, product);
  },
);

// DELETE /admin/products/:id
adminProductRouter.delete(
  "/:id",
  requirePermission("products:delete"),
  validate({ params: productIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const product = await softDeleteProduct(id);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "soft_delete",
      entityType: "product",
      entityId: id,
      beforeValue: product,
    });
    sendNoContent(res);
  },
);

// ─── Variant sub-routes ─────────────────────────────────────────────────────

// POST /admin/products/:id/variants
adminProductRouter.post(
  "/:id/variants",
  requirePermission("products:create"),
  validate({ params: productIdParam, body: createVariantSchema }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const variant = await createVariant(id, req.body);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorIp: req.ip ?? "unknown",
      action: "create",
      entityType: "product_variant",
      entityId: variant.id,
      afterValue: variant,
    });
    sendCreated(res, variant);
  },
);

// PATCH /admin/products/:id/variants/:variantId
adminProductRouter.patch(
  "/:id/variants/:variantId",
  requirePermission("products:update"),
  validate({ body: updateVariantSchema }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const variantId = req.params.variantId as string;
    const variant = await updateVariant(id, variantId, req.body);
    sendSuccess(res, variant);
  },
);

// DELETE /admin/products/:id/variants/:variantId
adminProductRouter.delete(
  "/:id/variants/:variantId",
  requirePermission("products:delete"),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const variantId = req.params.variantId as string;
    await deleteVariant(id, variantId);
    sendNoContent(res);
  },
);

// ─── Image sub-routes ───────────────────────────────────────────────────────

// POST /admin/products/:id/images
adminProductRouter.post(
  "/:id/images",
  requirePermission("products:update"),
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) throw badRequest("Image file required");
    const id = req.params.id as string;
    const image = await uploadProductImage(id, req.file, req.body);
    sendCreated(res, image);
  },
);

// PATCH /admin/products/:id/images/:imageId
adminProductRouter.patch(
  "/:id/images/:imageId",
  requirePermission("products:update"),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const imageId = req.params.imageId as string;
    const image = await updateProductImage(id, imageId, req.body);
    sendSuccess(res, image);
  },
);

// DELETE /admin/products/:id/images/:imageId
adminProductRouter.delete(
  "/:id/images/:imageId",
  requirePermission("products:delete"),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const imageId = req.params.imageId as string;
    await deleteProductImage(id, imageId);
    sendNoContent(res);
  },
);

export { adminProductRouter };
