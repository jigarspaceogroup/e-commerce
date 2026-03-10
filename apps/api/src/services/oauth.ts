import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  type TokenPayload,
  type TokenPair,
} from "../services/auth.js";
import { env } from "../config/env.js";

// =============================================================================
// Types
// =============================================================================

export type OAuthProvider = "google" | "apple";

export interface OAuthUserProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  nonce?: string;
}

// =============================================================================
// Google OAuth
// =============================================================================

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/**
 * Generate Google consent screen URL.
 * Returns null if Google OAuth credentials are not configured.
 */
export function getGoogleAuthUrl(): string | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CALLBACK_URL } = env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CALLBACK_URL) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange Google authorization code for tokens, fetch user profile,
 * and create/link the user account.
 *
 * Returns a token pair (access + refresh) on success.
 */
export async function handleGoogleCallback(
  code: string,
  userAgent?: string,
): Promise<TokenPair> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = env;

  // --- Dev fallback: skip HTTP calls when keys are missing ---
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    // TODO: Production hardening — reject instead of mocking
    console.warn("[OAuth] Google credentials not configured — returning mock tokens for dev");
    return issueDevTokenPair("google-dev-user-id");
  }

  // 1. Exchange authorization code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new OAuthError(
      "GOOGLE_TOKEN_EXCHANGE_FAILED",
      `Google token exchange failed: ${tokenRes.status} — ${body}`,
    );
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  // 2. Fetch user profile from Google
  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    throw new OAuthError(
      "GOOGLE_PROFILE_FETCH_FAILED",
      `Failed to fetch Google user info: ${profileRes.status}`,
    );
  }

  const profile = (await profileRes.json()) as GoogleUserInfo;

  // 3. Create or link user
  const user = await findOrCreateSocialUser({
    provider: "google",
    providerAccountId: profile.sub,
    email: profile.email,
    firstName: profile.given_name ?? profile.name ?? "",
    lastName: profile.family_name ?? "",
  });

  // 4. Issue token pair
  return issueTokenPair(user.id, userAgent);
}

// =============================================================================
// Apple Sign-In
// =============================================================================

/**
 * Handle Apple Sign-In callback.
 *
 * Apple sends a POST with `id_token` (JWT) and `code`.
 * We decode the id_token to extract user info — Apple's id_token is a signed
 * JWT that we should verify against Apple's public keys in production.
 */
export async function handleAppleCallback(
  idToken: string,
  _authorizationCode: string,
  userInfo?: { firstName?: string; lastName?: string },
  userAgent?: string,
): Promise<TokenPair> {
  const { APPLE_CLIENT_ID } = env;

  // --- Dev fallback ---
  if (!APPLE_CLIENT_ID) {
    console.warn("[OAuth] Apple credentials not configured — returning mock tokens for dev");
    return issueDevTokenPair("apple-dev-user-id");
  }

  // TODO: Production hardening — verify the id_token signature against
  // Apple's JWKS (https://appleid.apple.com/auth/keys) instead of just decoding.
  // Also verify: iss === "https://appleid.apple.com", aud === APPLE_CLIENT_ID,
  // exp > now, nonce matches.

  const decoded = jwt.decode(idToken) as AppleIdTokenPayload | null;

  if (!decoded || !decoded.sub) {
    throw new OAuthError(
      "APPLE_TOKEN_INVALID",
      "Failed to decode Apple identity token",
    );
  }

  // Apple may not include email on subsequent sign-ins (only the first time).
  // The `sub` (subject) is the stable user identifier.
  const email = decoded.email ?? "";

  const user = await findOrCreateSocialUser({
    provider: "apple",
    providerAccountId: decoded.sub,
    email,
    firstName: userInfo?.firstName ?? "",
    lastName: userInfo?.lastName ?? "",
  });

  return issueTokenPair(user.id, userAgent);
}

// =============================================================================
// Account linking / creation
// =============================================================================

interface SocialUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Account linking logic:
 *  1. If a social account with this provider + providerAccountId exists, return existing user.
 *  2. If a user with the same email exists, link the social identity to that user.
 *  3. Otherwise, create a new user and social account.
 *
 * TODO: Replace with real Prisma queries when database layer is wired up.
 */
export async function findOrCreateSocialUser(
  profile: OAuthUserProfile,
): Promise<SocialUser> {
  // TODO: Implement with Prisma — this is the skeleton placeholder.
  //
  // Pseudocode:
  //
  //   // 1. Check for existing social account
  //   const existing = await prisma.userSocialAccount.findUnique({
  //     where: {
  //       provider_providerAccountId: {
  //         provider: profile.provider,
  //         providerAccountId: profile.providerAccountId,
  //       },
  //     },
  //     include: { user: true },
  //   });
  //   if (existing) return existing.user;
  //
  //   // 2. Check for existing user by email
  //   if (profile.email) {
  //     const userByEmail = await prisma.user.findUnique({
  //       where: { email: profile.email },
  //     });
  //     if (userByEmail) {
  //       await prisma.userSocialAccount.create({
  //         data: {
  //           userId: userByEmail.id,
  //           provider: profile.provider,
  //           providerAccountId: profile.providerAccountId,
  //           email: profile.email,
  //         },
  //       });
  //       return userByEmail;
  //     }
  //   }
  //
  //   // 3. Create new user + social account
  //   const newUser = await prisma.user.create({
  //     data: {
  //       email: profile.email,
  //       firstName: profile.firstName,
  //       lastName: profile.lastName,
  //       emailVerifiedAt: new Date(), // social login implies verified email
  //       socialAccounts: {
  //         create: {
  //           provider: profile.provider,
  //           providerAccountId: profile.providerAccountId,
  //           email: profile.email,
  //         },
  //       },
  //     },
  //   });
  //   return newUser;

  // Placeholder: return a deterministic stub based on provider + id
  const stubId = `social-${profile.provider}-${profile.providerAccountId}`;
  return {
    id: stubId,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
  };
}

// =============================================================================
// Token issuance helpers
// =============================================================================

async function issueTokenPair(
  userId: string,
  userAgent?: string,
): Promise<TokenPair> {
  const jwtSecret = env.JWT_PRIVATE_KEY ?? "";

  // TODO: Fetch actual role and permissions from database
  const payload: TokenPayload = {
    sub: userId,
    role: "buyer",
    permissions: [],
  };

  const accessToken = generateAccessToken(payload, jwtSecret);
  const refreshToken = generateRefreshToken();

  await storeRefreshToken(refreshToken, userId, userAgent);

  return { accessToken, refreshToken };
}

/**
 * Issue a mock token pair for development when OAuth credentials are not set.
 */
async function issueDevTokenPair(mockUserId: string): Promise<TokenPair> {
  const jwtSecret = env.JWT_PRIVATE_KEY ?? "dev-secret";

  const payload: TokenPayload = {
    sub: mockUserId,
    role: "buyer",
    permissions: [],
  };

  const accessToken = generateAccessToken(payload, jwtSecret);
  const refreshToken = `dev-refresh-${Date.now()}`;

  // Skip Redis storage in dev mock mode — storeRefreshToken would fail without Redis
  // TODO: Decide if we want to store dev tokens
  return { accessToken, refreshToken };
}

// =============================================================================
// Errors
// =============================================================================

export class OAuthError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OAuthError";
    this.code = code;
  }
}
