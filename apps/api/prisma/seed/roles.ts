import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { ALL_PERMISSIONS, DEFAULT_ROLES } from "../../src/config/permissions.js";

// ---------------------------------------------------------------------------
// Deterministic UUIDs for cross-module references
// ---------------------------------------------------------------------------
export const ROLE_IDS = {
  SUPER_ADMIN: "a0000000-0000-4000-8000-000000000001",
  PRODUCT_MANAGER: "a0000000-0000-4000-8000-000000000002",
  ORDER_MANAGER: "a0000000-0000-4000-8000-000000000003",
  CONTENT_MANAGER: "a0000000-0000-4000-8000-000000000004",
  SUPPORT_AGENT: "a0000000-0000-4000-8000-000000000005",
} as const;

const ROLE_NAME_TO_ID: Record<string, string> = {
  "Super Admin": ROLE_IDS.SUPER_ADMIN,
  "Product Manager": ROLE_IDS.PRODUCT_MANAGER,
  "Order Manager": ROLE_IDS.ORDER_MANAGER,
  "Content Manager": ROLE_IDS.CONTENT_MANAGER,
  "Support Agent": ROLE_IDS.SUPPORT_AGENT,
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  "Super Admin": "Full unrestricted access to the entire platform",
  "Product Manager": "Manage products, categories, and related content",
  "Order Manager": "Manage orders, refunds, and view customer info",
  "Content Manager": "Manage CMS content and view categories",
  "Support Agent": "Handle support tickets, view customers and orders",
};

/**
 * Build a deterministic UUID for a permission based on its index.
 * This lets us reference permission IDs without a DB round-trip.
 */
function permissionId(index: number): string {
  const hex = (index + 1).toString(16).padStart(12, "0");
  return `b0000000-0000-4000-8000-${hex}`;
}

// ---------------------------------------------------------------------------
// Exported map: "resource:action" -> UUID (used by other seed modules if needed)
// ---------------------------------------------------------------------------
export const PERMISSION_ID_MAP: ReadonlyMap<string, string> = new Map(
  ALL_PERMISSIONS.map((perm, idx) => [perm, permissionId(idx)]),
);

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedRoles(prisma: PrismaClient): Promise<void> {
  console.log("Seeding permissions...");

  // 1. Upsert every permission
  for (let i = 0; i < ALL_PERMISSIONS.length; i++) {
    const perm = ALL_PERMISSIONS[i]!;
    const [resource, action] = perm.split(":") as [string, string];
    const id = permissionId(i);

    await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: {
        id,
        resource,
        action,
        description: `Allows ${action} on ${resource}`,
      },
    });
  }

  console.log(`  Created ${ALL_PERMISSIONS.length} permissions`);

  // 2. Upsert roles
  console.log("Seeding roles...");

  for (const [roleName, permissions] of DEFAULT_ROLES) {
    const roleId = ROLE_NAME_TO_ID[roleName];
    if (!roleId) continue;

    await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: {
        id: roleId,
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
      },
    });

    // Resolve which permission IDs to link.
    // "*" (Super Admin) maps to ALL permissions.
    const resolvedPermissions =
      permissions.includes("*") ? [...ALL_PERMISSIONS] : [...permissions];

    const rolePermissionData = resolvedPermissions
      .map((perm) => {
        const permId = PERMISSION_ID_MAP.get(perm);
        if (!permId) return null;
        return { roleId, permissionId: permId };
      })
      .filter((rp): rp is { roleId: string; permissionId: string } => rp !== null);

    await prisma.rolePermission.createMany({
      data: rolePermissionData,
      skipDuplicates: true,
    });
  }

  console.log(`  Created ${DEFAULT_ROLES.size} roles with permission links`);
  console.log("Roles seeded");
}
