import { Router, type IRouter, type Request, type Response } from "express";
import {
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  generateAccessToken,
  type TokenPayload,
} from "../services/auth.js";

const authRouter: IRouter = Router();

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 */
authRouter.post("/auth/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: "AUTH_REFRESH_MISSING", message: "Refresh token required" },
    });
    return;
  }

  const tokenData = await verifyRefreshToken(refreshToken);
  if (!tokenData) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: "AUTH_REFRESH_INVALID", message: "Invalid or expired refresh token" },
    });
    return;
  }

  // Rotate refresh token (one-time use with reuse detection)
  const userAgent = req.headers["user-agent"];
  const newRefreshToken = await rotateRefreshToken(
    refreshToken,
    tokenData.userId,
    userAgent,
  );

  if (!newRefreshToken) {
    // Reuse detected — all sessions invalidated
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "AUTH_REFRESH_REUSE",
        message: "Token reuse detected. All sessions invalidated.",
      },
    });
    return;
  }

  // TODO: Fetch user role and permissions from database
  const payload: TokenPayload = {
    sub: tokenData.userId,
    role: "buyer",
    permissions: [],
  };

  const jwtSecret = process.env.JWT_PRIVATE_KEY ?? "";
  const accessToken = generateAccessToken(payload, jwtSecret);

  // Set new refresh token in HTTP-only cookie
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/v1/auth",
  });

  res.json({
    success: true,
    data: { accessToken },
  });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
authRouter.post("/auth/logout", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (refreshToken) {
    const tokenData = await verifyRefreshToken(refreshToken);
    if (tokenData) {
      await revokeRefreshToken(refreshToken, tokenData.userId);
    }
  }

  res.clearCookie("refreshToken", { path: "/api/v1/auth" });
  res.json({
    success: true,
    data: { message: "Logged out successfully" },
  });
});

export { authRouter };
