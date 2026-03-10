import type { Request, Response, NextFunction } from "express";

/**
 * Wrap an async Express route handler so that rejected promises are
 * automatically forwarded to the error-handling middleware.
 *
 * Usage:
 * ```ts
 * router.get("/products", asyncHandler(async (req, res) => {
 *   const products = await prisma.product.findMany();
 *   sendSuccess(res, products);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = fn(req, res, next);
    if (result instanceof Promise) {
      result.catch(next);
    }
  };
}
