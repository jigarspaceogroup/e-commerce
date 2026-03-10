// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Supported filter operators.
 *
 * - `eq`       — exact match
 * - `gte`      — greater than or equal
 * - `lte`      — less than or equal
 * - `in`       — value is one of a comma-separated list
 * - `contains` — substring / partial match (case-insensitive)
 */
export type FilterOperator = "eq" | "gte" | "lte" | "in" | "contains";

export type FilterFieldType = "string" | "number" | "boolean" | "date";

/**
 * Configuration for a single filterable field.
 *
 * `queryParam` is the key in the query string (e.g. `"priceMin"`).
 * `field`      is the database column name (e.g. `"price"`).
 */
export interface FilterFieldConfig {
  queryParam: string;
  field: string;
  operator: FilterOperator;
  type: FilterFieldType;
}

export interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Parse filter parameters
// ---------------------------------------------------------------------------

function coerceValue(raw: string, type: FilterFieldType): unknown {
  switch (type) {
    case "number": {
      const num = Number(raw);
      return Number.isNaN(num) ? undefined : num;
    }
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      return undefined;
    case "date": {
      const date = new Date(raw);
      return Number.isNaN(date.getTime()) ? undefined : date;
    }
    case "string":
    default:
      return raw;
  }
}

/**
 * Extract and validate filter values from the query string based on the
 * provided configuration.
 *
 * Unknown query parameters are silently ignored, as are parameters whose values
 * fail coercion.
 */
export function parseFilterParams(
  query: Record<string, unknown>,
  filterConfig: FilterFieldConfig[],
): ParsedFilter[] {
  const filters: ParsedFilter[] = [];

  for (const config of filterConfig) {
    const raw = query[config.queryParam];
    if (raw === undefined || raw === null || raw === "") {
      continue;
    }

    const rawStr = String(raw);

    if (config.operator === "in") {
      // Comma-separated list: "a,b,c"
      const parts = rawStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const coerced = parts
        .map((p) => coerceValue(p, config.type))
        .filter((v) => v !== undefined);

      if (coerced.length > 0) {
        filters.push({
          field: config.field,
          operator: "in",
          value: coerced,
        });
      }
    } else {
      const value = coerceValue(rawStr, config.type);
      if (value !== undefined) {
        filters.push({
          field: config.field,
          operator: config.operator,
          value,
        });
      }
    }
  }

  return filters;
}

// ---------------------------------------------------------------------------
// Build Prisma where clause
// ---------------------------------------------------------------------------

/**
 * Convert an array of parsed filters into a Prisma-compatible `where` object.
 *
 * Example output:
 * ```ts
 * {
 *   status: "active",
 *   price: { gte: 100, lte: 500 },
 *   categoryId: { in: ["uuid-1", "uuid-2"] },
 *   name: { contains: "shirt", mode: "insensitive" },
 * }
 * ```
 */
export function buildPrismaWhere(
  filters: ParsedFilter[],
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const { field, operator, value } of filters) {
    switch (operator) {
      case "eq":
        where[field] = value;
        break;

      case "gte":
      case "lte": {
        const existing =
          (where[field] as Record<string, unknown> | undefined) ?? {};
        existing[operator] = value;
        where[field] = existing;
        break;
      }

      case "in":
        where[field] = { in: value };
        break;

      case "contains":
        where[field] = { contains: value, mode: "insensitive" };
        break;
    }
  }

  return where;
}
