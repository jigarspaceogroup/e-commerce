import type { Response } from "express";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "@repo/types";

/**
 * Send a success response with the standard API envelope.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
): void {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };

  res.status(statusCode).json(body);
}

/**
 * Send a paginated response with pagination metadata.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
): void {
  const body: PaginatedResponse<T> = {
    success: true,
    data,
    meta: { pagination },
  };

  res.status(200).json(body);
}

/**
 * Send a 201 Created response with the standard API envelope.
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

/**
 * Send a 204 No Content response (empty body).
 */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}
