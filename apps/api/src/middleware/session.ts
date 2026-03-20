import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { verifyAccessToken, type TokenPayload } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      cartUserId?: string;
      cartSessionId?: string;
    }
  }
}

export function cartSession(req: Request, res: Response, next: NextFunction): void {
  // Try JWT auth first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_PRIVATE_KEY ?? process.env.JWT_PUBLIC_KEY ?? "";
    try {
      const payload: TokenPayload = verifyAccessToken(token, jwtSecret);
      req.cartUserId = payload.sub;
      req.user = payload;
      next();
      return;
    } catch {
      // Invalid token — fall through to session
    }
  }

  // Guest: read or create session cookie
  let sessionId = req.cookies?.cart_session;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookie("cart_session", sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  req.cartSessionId = sessionId;
  next();
}
