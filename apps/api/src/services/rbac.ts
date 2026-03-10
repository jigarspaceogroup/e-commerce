// ---------------------------------------------------------------------------
// RBAC service — permission resolution, caching, and helpers
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, cacheDel, getRedisClient } from "./redis.js";

/** Redis key for a user's cached permission set. */
const PERMISSIONS_KEY_PREFIX = "user_permissions:";

/** Cache TTL in seconds (5 minutes). */
const PERMISSIONS_TTL = 5 * 60;

// ---------------------------------------------------------------------------
// getUserPermissions
// ---------------------------------------------------------------------------
/**
 * Return the full list of permission strings that apply to `userId`.
 *
 * Resolution order:
 *   1. Check Redis cache (`user_permissions:{userId}`)
 *   2. On cache miss, load from DB (roles → role-permissions)
 *   3. Store the result in Redis with a 5-minute TTL
 *
 * TODO: Replace the mock DB query below with a real Prisma query once the
 *       Prisma client is wired up. The query should be:
 *       ```
 *       SELECT DISTINCT p.key
 *       FROM "Permission" p
 *       JOIN "RolePermission" rp ON rp."permissionId" = p.id
 *       JOIN "UserRole"       ur ON ur."roleId"       = rp."roleId"
 *       WHERE ur."userId" = $1
 *       ```
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = `${PERMISSIONS_KEY_PREFIX}${userId}`;

  // 1. Try the cache first
  const cached = await cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  // 2. Load from DB
  // TODO: Replace with actual Prisma query when available
  const permissions = await loadPermissionsFromDb(userId);

  // 3. Cache the result
  await cacheSet(cacheKey, permissions, PERMISSIONS_TTL);

  return permissions;
}

// ---------------------------------------------------------------------------
// invalidateUserPermissions
// ---------------------------------------------------------------------------
/** Remove the cached permission set for a single user. */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  const cacheKey = `${PERMISSIONS_KEY_PREFIX}${userId}`;
  await cacheDel(cacheKey);
}

// ---------------------------------------------------------------------------
// invalidateRolePermissions
// ---------------------------------------------------------------------------
/**
 * When a role's permissions change, every user that holds that role must have
 * their cached permissions invalidated.
 *
 * TODO: Replace the mock user-ID lookup with a real Prisma query:
 *       ```
 *       SELECT "userId" FROM "UserRole" WHERE "roleId" = $1
 *       ```
 */
export async function invalidateRolePermissions(roleId: string): Promise<void> {
  // TODO: Replace with actual Prisma query when available
  const userIds = await getUsersByRoleFromDb(roleId);

  // Delete each user's cached permissions. A pipeline keeps this efficient.
  if (userIds.length > 0) {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    for (const uid of userIds) {
      pipeline.del(`${PERMISSIONS_KEY_PREFIX}${uid}`);
    }
    await pipeline.exec();
  }
}

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------
/**
 * Check whether `userPermissions` satisfies a single `required` permission.
 *
 * Match hierarchy (first match wins):
 *   1. Global wildcard  — `*`           matches everything
 *   2. Resource wildcard — `products:*`  matches `products:create`, etc.
 *   3. Exact match       — `products:create` === `products:create`
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  // 1. Global wildcard
  if (userPermissions.includes("*")) return true;

  // 2. Resource wildcard (e.g. user has `products:*`, required is `products:create`)
  const [resource] = required.split(":");
  if (resource && userPermissions.includes(`${resource}:*`)) return true;

  // 3. Exact match
  return userPermissions.includes(required);
}

// ---------------------------------------------------------------------------
// isResourceOwner
// ---------------------------------------------------------------------------
/** Simple ownership check — compares the authenticated user with the resource owner. */
export function isResourceOwner(userId: string, resourceOwnerId: string): boolean {
  return userId === resourceOwnerId;
}

// ---------------------------------------------------------------------------
// Mock DB helpers (to be replaced by Prisma)
// ---------------------------------------------------------------------------

/**
 * TODO: Replace with Prisma query.
 * Returns the list of permission keys for a given user by traversing
 * UserRole → RolePermission → Permission.
 */
async function loadPermissionsFromDb(_userId: string): Promise<string[]> {
  // In development without a connected DB, return an empty set so the
  // middleware chain doesn't break. Real implementation will query Prisma.
  return [];
}

/**
 * TODO: Replace with Prisma query.
 * Returns all user IDs that hold the given role.
 */
async function getUsersByRoleFromDb(_roleId: string): Promise<string[]> {
  return [];
}
