import type { Request, Response, NextFunction } from "express";
import { type ZodObject, type ZodError, type ZodSchema } from "zod";

export interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodObject<Record<string, ZodSchema>>;
  query?: ZodObject<Record<string, ZodSchema>>;
}

function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: { field: string; message: string }[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...formatZodError(result.error));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...formatZodError(result.error));
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...formatZodError(result.error));
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: errors,
        },
      });
      return;
    }

    next();
  };
}
