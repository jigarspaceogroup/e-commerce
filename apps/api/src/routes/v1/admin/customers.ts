import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate, requirePermission } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validation.js";
import { customerListQuery, customerIdParam } from "../../../schemas/customer.js";
import { listCustomers, getCustomerById } from "../../../services/customer.js";
import { sendSuccess, sendPaginated } from "../../../utils/response.js";

const adminCustomerRouter: IRouter = Router();

adminCustomerRouter.use(authenticate, requirePermission("customers:read"));

// GET /admin/customers
adminCustomerRouter.get(
  "/",
  validate({ query: customerListQuery }),
  async (req: Request, res: Response) => {
    const result = await listCustomers(req.query as Record<string, unknown>);
    sendPaginated(res, result.data, {
      cursor: result.nextCursor,
      hasMore: result.hasMore,
      limit: Number(req.query.limit) || 20,
    });
  },
);

// GET /admin/customers/:id
adminCustomerRouter.get(
  "/:id",
  validate({ params: customerIdParam }),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const customer = await getCustomerById(id);
    sendSuccess(res, customer);
  },
);

export { adminCustomerRouter };
