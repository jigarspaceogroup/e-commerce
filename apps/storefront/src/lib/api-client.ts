import type { ApiResponse } from "@repo/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Attempt to refresh the access token using the refresh-token cookie.
 * Returns the new access token or `null` on failure.
 *
 * Only one refresh request is in-flight at a time; concurrent callers share
 * the same promise.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
      if (body.success && body.data.accessToken) {
        setAccessToken(body.data.accessToken);
        return body.data.accessToken;
      }

      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------------------------------------------------------------------------
// UUID v4 generator (no dependency needed)
// ---------------------------------------------------------------------------

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(opts: RequestOptions): Promise<ApiResponse<T>> {
  const url = new URL(`${BASE_URL}${opts.path}`);

  if (opts.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": generateRequestId(),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url.toString(), {
    method: opts.method,
    headers,
    credentials: "include",
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  // ── Handle 401: attempt token refresh then retry once ─────────────────
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url.toString(), {
        method: opts.method,
        headers,
        credentials: "include",
        ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      });
    }
  }

  // ── 204 No Content ────────────────────────────────────────────────────
  if (res.status === 204) {
    return { success: true, data: undefined as T };
  }

  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

// ---------------------------------------------------------------------------
// Public API client
// ---------------------------------------------------------------------------

export const apiClient = {
  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApiResponse<T>> {
    return request<T>({ method: "GET", path, params });
  },

  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>({ method: "POST", path, body });
  },

  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>({ method: "PUT", path, body });
  },

  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>({ method: "PATCH", path, body });
  },

  del<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>({ method: "DELETE", path });
  },
};
