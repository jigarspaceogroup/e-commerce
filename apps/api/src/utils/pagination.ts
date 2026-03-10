import type { PaginationMeta } from "@repo/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Cursor encoding / decoding
// ---------------------------------------------------------------------------

/**
 * Base64-encode an ID to produce an opaque cursor string.
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf-8").toString("base64url");
}

/**
 * Decode a base64url cursor back to the original ID.
 * Returns `null` if the cursor is invalid.
 */
export function decodeCursor(cursor: string): string | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse pagination query params
// ---------------------------------------------------------------------------

export interface PaginationParams {
  cursor: string | null;
  limit: number;
}

/**
 * Extract and validate `cursor` and `limit` from the incoming query string.
 *
 * - `limit` defaults to 20 and is clamped to [1, 100].
 * - `cursor` is decoded; an invalid cursor results in `null` (start from the
 *   beginning).
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
): PaginationParams {
  // ── limit ──────────────────────────────────────────────────────────────
  let limit = DEFAULT_LIMIT;
  if (query.limit !== undefined) {
    const parsed = Number(query.limit);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      limit = Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
    }
  }

  // ── cursor ─────────────────────────────────────────────────────────────
  let cursor: string | null = null;
  if (typeof query.cursor === "string" && query.cursor.length > 0) {
    cursor = decodeCursor(query.cursor);
  }

  return { cursor, limit };
}

// ---------------------------------------------------------------------------
// Build PaginationMeta
// ---------------------------------------------------------------------------

/**
 * Construct a `PaginationMeta` object from a page of items.
 *
 * The convention is to request `limit + 1` items from the data source so that
 * `hasMore` can be determined by checking whether the extra item was returned.
 * If the caller has already sliced the result to `limit`, set `hasMore`
 * accordingly before calling this helper.
 *
 * @param items   - The items returned for this page (may include the extra
 *                  peek item if `limit + 1` rows were fetched).
 * @param limit   - The requested page size.
 * @param totalCount - Optional total count across all pages.
 */
export function buildPaginationMeta<T extends { id: string }>(
  items: T[],
  limit: number,
  totalCount?: number,
): { paginatedItems: T[]; pagination: PaginationMeta } {
  const hasMore = items.length > limit;
  const paginatedItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = paginatedItems[paginatedItems.length - 1];

  const pagination: PaginationMeta = {
    limit,
    hasMore,
    ...(lastItem ? { cursor: encodeCursor(lastItem.id) } : {}),
    ...(totalCount !== undefined ? { total: totalCount } : {}),
  };

  return { paginatedItems, pagination };
}

// ---------------------------------------------------------------------------
// Prisma cursor-pagination helper
// ---------------------------------------------------------------------------

export interface PrismaPaginationArgs {
  take: number;
  skip?: number;
  cursor?: { id: string };
}

/**
 * Convert parsed pagination params into a Prisma-compatible `findMany` shape.
 *
 * We request `limit + 1` rows so the caller can detect whether there is a next
 * page (the extra row is trimmed by `buildPaginationMeta`).
 */
export function applyPaginationToPrisma(
  params: PaginationParams,
): PrismaPaginationArgs {
  const args: PrismaPaginationArgs = {
    take: params.limit + 1, // fetch one extra to detect hasMore
  };

  if (params.cursor) {
    args.cursor = { id: params.cursor };
    args.skip = 1; // skip the cursor item itself
  }

  return args;
}
