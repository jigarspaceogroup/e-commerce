import { Router, type IRouter, type Request, type Response } from "express";
import { publicRateLimiter } from "../../middleware/rate-limit.js";
import { getCachedCategoryTree, getCategoryBySlug } from "../../services/category.js";
import { sendSuccess } from "../../utils/response.js";

const publicCategoryRouter: IRouter = Router();

publicCategoryRouter.use(publicRateLimiter);

// GET /categories — cached tree
publicCategoryRouter.get("/", async (_req: Request, res: Response) => {
  const tree = await getCachedCategoryTree();
  sendSuccess(res, tree);
});

// GET /categories/:slug
publicCategoryRouter.get("/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const result = await getCategoryBySlug(slug);
  if ("redirect" in result) {
    res.redirect(301, `/api/v1/categories/${result.redirect}`);
    return;
  }
  sendSuccess(res, result);
});

export { publicCategoryRouter };
