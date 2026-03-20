import { Router, type IRouter } from "express";
import { z } from "zod";
import { searchProductsAPI, searchSuggestions } from "../../services/search-api.js";

export const searchRouter: IRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1),
  category_id: z.string().uuid().optional(),
  brand: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  in_stock: z.enum(["true", "false"]).optional().transform((v) => v === "true" ? true : v === "false" ? false : undefined),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).default("relevance"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

searchRouter.get("/", async (req, res, next) => {
  try {
    const params = searchQuerySchema.parse(req.query);
    const result = await searchProductsAPI({
      q: params.q,
      categoryId: params.category_id,
      brands: params.brand,
      priceMin: params.price_min,
      priceMax: params.price_max,
      inStock: params.in_stock,
      sort: params.sort,
      limit: params.limit,
      offset: params.offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const suggestSchema = z.object({
  q: z.string().min(2),
});

searchRouter.get("/suggest", async (req, res, next) => {
  try {
    const { q } = suggestSchema.parse(req.query);
    const result = await searchSuggestions(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
