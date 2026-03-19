import { Router, type IRouter, type Request, type Response } from "express";
import { publicRateLimiter } from "../../middleware/rate-limit.js";
import { validate } from "../../middleware/validation.js";
import { publicProductListQuery } from "../../schemas/product.js";
import { listPublicProducts, getPublicProductBySlug } from "../../services/product.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";

const publicProductRouter: IRouter = Router();

publicProductRouter.use(publicRateLimiter);

// GET /products
publicProductRouter.get(
  "/",
  validate({ query: publicProductListQuery }),
  async (req: Request, res: Response) => {
    const result = await listPublicProducts(req.query as Record<string, unknown>);
    sendPaginated(res, result.data, {
      cursor: result.nextCursor,
      hasMore: result.hasMore,
      limit: Number(req.query.limit) || 20,
    });
  },
);

// GET /products/:slug
publicProductRouter.get("/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const result = await getPublicProductBySlug(slug);
  if ("redirect" in result) {
    res.redirect(301, `/api/v1/products/${result.redirect}`);
    return;
  }
  sendSuccess(res, result);
});

export { publicProductRouter };
