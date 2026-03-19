const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

/**
 * Server-side fetch for use in server components and React Query prefetching.
 * Does NOT use cookies/credentials — only accesses public endpoints.
 */
export async function serverFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "API request failed");
  return json.data;
}

/**
 * Server-side paginated fetch. Returns data + pagination meta.
 */
export async function serverFetchPaginated<T>(
  path: string,
  params?: Record<string, string>,
): Promise<{ data: T[]; hasMore: boolean; nextCursor?: string }> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return {
    data: json.data,
    hasMore: json.meta?.pagination?.hasMore ?? false,
    nextCursor: json.meta?.pagination?.cursor,
  };
}

/**
 * Parse Prisma Decimal fields (serialized as strings) to numbers.
 * Call on raw API data before passing to components.
 */
export function parseDecimalFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (field in result && result[field] != null) {
      result[field] = Number(result[field]) as T[keyof T];
    }
  }
  return result;
}
