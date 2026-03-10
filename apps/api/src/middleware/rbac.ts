// ---------------------------------------------------------------------------
// Enhanced RBAC middleware — composable role & ownership checks
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from "express";
import { hasPermission } from "../services/rbac.js";

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------
/**
 * Middleware that ensures the authenticated user has **one of** the specified
 * roles. The role is read from `req.user.role` (populated by `authenticate`).
 *
 * Usage:
 *   router.get("/admin", authenticate, requireRole("Super Admin", "Product Manager"), handler);
 */
export function requireRole(...roleNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: { code: "AUTH_TOKEN_MISSING", message: "Authentication required" },
      });
      return;
    }

    const userRole = req.user.role;

    if (!roleNames.includes(userRole)) {
      res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "AUTH_FORBIDDEN",
          message: `Required role: ${roleNames.join(" | ")}`,
        },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// requireOwnership
// ---------------------------------------------------------------------------
/**
 * Middleware that ensures the authenticated user **owns** the resource being
 * accessed. The caller supplies an `ownerIdExtractor` function that pulls the
 * owner's ID from the request (e.g., from params, body, or a pre-loaded
 * entity on `req`).
 *
 * Users with the global wildcard permission (`*`) bypass the ownership check,
 * because they are considered super admins.
 *
 * Usage:
 *   router.put(
 *     "/orders/:id",
 *     authenticate,
 *     requireOwnership((req) => req.params.userId),
 *     handler,
 *   );
 */
export function requireOwnership(ownerIdExtractor: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: { code: "AUTH_TOKEN_MISSING", message: "Authentication required" },
      });
      return;
    }

    // Super admins (wildcard permission) bypass ownership checks
    if (hasPermission(req.user.permissions, "*")) {
      next();
      return;
    }

    const ownerId = ownerIdExtractor(req);

    if (req.user.sub !== ownerId) {
      res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "AUTH_FORBIDDEN",
          message: "You do not have access to this resource",
        },
      });
      return;
    }

    next();
  };
}
