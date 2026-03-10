// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortDirection = "asc" | "desc";

export interface SortField {
  field: string;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Parse sort parameter
// ---------------------------------------------------------------------------

/**
 * Parse a comma-separated sort string (e.g. `"price:asc,createdAt:desc"`) into
 * a validated array of `SortField` objects.
 *
 * - Only fields present in `allowedFields` are kept.
 * - Invalid directions default to `"asc"`.
 * - Invalid or disallowed fields are silently dropped.
 *
 * Returns an empty array when no valid fields are found.
 */
export function parseSortParam(
  sort: string | undefined | null,
  allowedFields: string[],
): SortField[] {
  if (!sort || typeof sort !== "string") {
    return [];
  }

  const allowedSet = new Set(allowedFields);
  const result: SortField[] = [];

  const segments = sort.split(",").map((s) => s.trim()).filter(Boolean);

  for (const segment of segments) {
    const [field, rawDir] = segment.split(":");
    if (!field || !allowedSet.has(field)) {
      continue;
    }

    const direction: SortDirection =
      rawDir === "asc" || rawDir === "desc" ? rawDir : "asc";

    result.push({ field, direction });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build Prisma orderBy
// ---------------------------------------------------------------------------

/**
 * Convert an array of `SortField` objects into the Prisma `orderBy` format:
 *
 * ```ts
 * [{ price: 'asc' }, { createdAt: 'desc' }]
 * ```
 */
export function buildPrismaOrderBy(
  sortFields: SortField[],
): Record<string, SortDirection>[] {
  return sortFields.map(({ field, direction }) => ({ [field]: direction }));
}
