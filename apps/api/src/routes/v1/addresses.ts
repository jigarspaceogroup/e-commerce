import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validation.js";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
  createAddressSchema,
  updateAddressSchema,
} from "../../services/address.js";
import { sendSuccess, sendCreated, sendNoContent } from "../../utils/response.js";

const addressRouter: IRouter = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid address ID"),
});

// ─── GET /users/me/addresses ──────────────────────────────────────────────────
addressRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addresses = await listAddresses(req.user!.sub);
    sendSuccess(res, addresses);
  } catch (err) {
    next(err);
  }
});

// ─── POST /users/me/addresses ─────────────────────────────────────────────────
addressRouter.post(
  "/",
  validate({ body: createAddressSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = await createAddress(req.user!.sub, req.body);
      sendCreated(res, address);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /users/me/addresses/:id ──────────────────────────────────────────────
addressRouter.put(
  "/:id",
  validate({ params: uuidParamSchema, body: updateAddressSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const address = await updateAddress(req.user!.sub, id, req.body);
      sendSuccess(res, address);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /users/me/addresses/:id ───────────────────────────────────────────
addressRouter.delete(
  "/:id",
  validate({ params: uuidParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await deleteAddress(req.user!.sub, id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /users/me/addresses/:id/default ────────────────────────────────────
addressRouter.patch(
  "/:id/default",
  validate({ params: uuidParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const address = await setDefault(req.user!.sub, id);
      sendSuccess(res, address);
    } catch (err) {
      next(err);
    }
  },
);

export { addressRouter };
