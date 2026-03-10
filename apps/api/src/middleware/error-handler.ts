import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Error factories
// ---------------------------------------------------------------------------

export function notFound(message = "Resource not found"): AppError {
  return new AppError(message, 404, "RESOURCE_NOT_FOUND");
}

export function badRequest(message = "Bad request"): AppError {
  return new AppError(message, 400, "BAD_REQUEST");
}

export function unauthorized(message = "Authentication required"): AppError {
  return new AppError(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Insufficient permissions"): AppError {
  return new AppError(message, 403, "FORBIDDEN");
}

export function conflict(message = "Resource already exists"): AppError {
  return new AppError(message, 409, "CONFLICT");
}

export function tooManyRequests(message = "Too many requests"): AppError {
  return new AppError(message, 429, "TOO_MANY_REQUESTS");
}

// ---------------------------------------------------------------------------
// Zod error → validation details helper
// ---------------------------------------------------------------------------

function formatZodError(err: ZodError): { field: string; message: string }[] {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// ---------------------------------------------------------------------------
// 404 handler for unmatched routes
// ---------------------------------------------------------------------------

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND"));
}

// ---------------------------------------------------------------------------
// Centralised error handler (must be registered last)
// ---------------------------------------------------------------------------

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV !== "production";

  // ── ZodError ────────────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: formatZodError(err),
      },
    });
    return;
  }

  // ── AppError (operational) ──────────────────────────────────────────
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      data: null,
      error: {
        code: err.code,
        message: err.message,
        ...(isDev ? { stack: err.stack } : {}),
      },
    };

    res.status(err.statusCode).json(body);
    return;
  }

  // ── Unknown / unexpected error ──────────────────────────────────────
  // Log the full error for debugging (in production the logger picks this up)
  if (req.log) {
    req.log.error(err, "Unhandled error");
  } else {
    console.error("Unhandled error:", err);
  }

  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isDev ? err.message : "An unexpected error occurred",
      ...(isDev ? { stack: err.stack } : {}),
    },
  });
}
