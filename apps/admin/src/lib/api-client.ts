const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

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

      const body = await res.json();
      if (body.success && body.data?.accessToken) {
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

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(opts: RequestOptions): Promise<{ success: boolean; data: T; error?: any }> {
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

  if (res.status === 204) {
    return { success: true, data: undefined as T };
  }

  return res.json();
}

export async function uploadFile<T>(
  path: string,
  file: File,
  data?: Record<string, string>,
): Promise<T> {
  const formData = new FormData();
  formData.append("image", file);
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value);
    }
  }
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return request<T>({ method: "GET", path, params });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>({ method: "POST", path, body });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>({ method: "PUT", path, body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>({ method: "PATCH", path, body });
  },
  del<T>(path: string) {
    return request<T>({ method: "DELETE", path });
  },
};
