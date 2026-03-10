import { Router, type IRouter, type Request, type Response } from "express";
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  handleAppleCallback,
  OAuthError,
} from "../services/oauth.js";

const oauthRouter: IRouter = Router();

// =============================================================================
// Shared helpers
// =============================================================================

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/auth",
};

function sendOAuthError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({
    success: false,
    data: null,
    error: { code, message },
  });
}

// =============================================================================
// Google OAuth
// =============================================================================

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Redirect to Google consent screen
 *     tags: [OAuth]
 *     responses:
 *       302:
 *         description: Redirect to Google
 *       503:
 *         description: Google OAuth not configured
 */
oauthRouter.get("/auth/google", (_req: Request, res: Response) => {
  const url = getGoogleAuthUrl();

  if (!url) {
    sendOAuthError(res, 503, "OAUTH_NOT_CONFIGURED", "Google OAuth is not configured");
    return;
  }

  res.redirect(url);
});

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [OAuth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Missing authorization code or user denied access
 *       500:
 *         description: OAuth flow failed
 */
oauthRouter.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  // Google sends ?error=access_denied when user cancels
  if (error) {
    sendOAuthError(res, 400, "OAUTH_DENIED", `Google authorization denied: ${error}`);
    return;
  }

  if (!code || typeof code !== "string") {
    sendOAuthError(res, 400, "OAUTH_CODE_MISSING", "Authorization code is required");
    return;
  }

  try {
    const userAgent = req.headers["user-agent"];
    const { accessToken, refreshToken } = await handleGoogleCallback(code, userAgent);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    // TODO: In production, redirect to the frontend with the access token
    // (e.g., via URL fragment or a short-lived code). For the skeleton we
    // return JSON so the flow can be tested directly.
    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    if (err instanceof OAuthError) {
      sendOAuthError(res, 500, err.code, err.message);
      return;
    }
    console.error("[OAuth] Google callback error:", err);
    sendOAuthError(res, 500, "OAUTH_INTERNAL_ERROR", "An unexpected error occurred during Google sign-in");
  }
});

// =============================================================================
// Apple Sign-In
// =============================================================================

/**
 * @openapi
 * /auth/apple:
 *   post:
 *     summary: Handle Apple Sign-In callback
 *     tags: [OAuth]
 *     description: |
 *       Apple sends a POST request with form-encoded data containing `id_token`,
 *       `code`, and optionally a `user` JSON string (on first sign-in only).
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [id_token, code]
 *             properties:
 *               id_token:
 *                 type: string
 *               code:
 *                 type: string
 *               user:
 *                 type: string
 *                 description: JSON string with name info (first sign-in only)
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_token, code]
 *             properties:
 *               id_token:
 *                 type: string
 *               code:
 *                 type: string
 *               user:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: OAuth flow failed
 */
oauthRouter.post("/auth/apple", async (req: Request, res: Response) => {
  // Apple can POST as form-encoded or the frontend may relay as JSON
  const idToken = (req.body.id_token ?? req.body.idToken) as string | undefined;
  const authorizationCode = (req.body.code ?? req.body.authorizationCode) as string | undefined;

  if (!idToken || !authorizationCode) {
    sendOAuthError(res, 400, "OAUTH_FIELDS_MISSING", "id_token and code are required");
    return;
  }

  // Apple provides user info only on the very first sign-in
  let userInfo: { firstName?: string; lastName?: string } | undefined;
  try {
    const rawUser = req.body.user;
    if (typeof rawUser === "string") {
      const parsed = JSON.parse(rawUser) as { name?: { firstName?: string; lastName?: string } };
      userInfo = parsed.name;
    } else if (rawUser && typeof rawUser === "object") {
      userInfo = rawUser as { firstName?: string; lastName?: string };
    }
  } catch {
    // user field is optional and may be malformed — ignore
  }

  try {
    const userAgent = req.headers["user-agent"];
    const { accessToken, refreshToken } = await handleAppleCallback(
      idToken,
      authorizationCode,
      userInfo,
      userAgent,
    );

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    if (err instanceof OAuthError) {
      sendOAuthError(res, 500, err.code, err.message);
      return;
    }
    console.error("[OAuth] Apple callback error:", err);
    sendOAuthError(res, 500, "OAUTH_INTERNAL_ERROR", "An unexpected error occurred during Apple sign-in");
  }
});

export { oauthRouter };
