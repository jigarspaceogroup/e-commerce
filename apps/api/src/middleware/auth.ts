import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: "AUTH_TOKEN_MISSING", message: "Authentication required" },
    });
    return;
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_PRIVATE_KEY ?? process.env.JWT_PUBLIC_KEY ?? "";

  try {
    const payload = verifyAccessToken(token, jwtSecret);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: "AUTH_TOKEN_INVALID", message: "Invalid or expired token" },
    });
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: { code: "AUTH_TOKEN_MISSING", message: "Authentication required" },
      });
      return;
    }

    const userPerms = req.user.permissions;

    // Check each required permission against the user's set.
    // Match hierarchy per permission:
    //   1. Global wildcard  `*`           — matches everything
    //   2. Resource wildcard `resource:*` — matches any action on that resource
    //   3. Exact match
    const hasAll = permissions.every((required) => {
      // 1. Global wildcard
      if (userPerms.includes("*")) return true;

      // 2. Resource wildcard (e.g. user has `products:*`, required is `products:create`)
      const [resource] = required.split(":");
      if (resource && userPerms.includes(`${resource}:*`)) return true;

      // 3. Exact match
      return userPerms.includes(required);
    });

    if (!hasAll) {
      res.status(403).json({
        success: false,
        data: null,
        error: { code: "AUTH_FORBIDDEN", message: "Insufficient permissions" },
      });
      return;
    }

    next();
  };
}
