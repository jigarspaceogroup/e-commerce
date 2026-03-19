// ---------------------------------------------------------------------------
// RBAC permission constants and default role definitions
// Permission format: `resource:action`
// Wildcard `*` grants access to everything; `resource:*` grants all actions
// on a specific resource.
// ---------------------------------------------------------------------------

// ---- Products ----
export const PRODUCTS_CREATE = "products:create" as const;
export const PRODUCTS_READ = "products:read" as const;
export const PRODUCTS_UPDATE = "products:update" as const;
export const PRODUCTS_DELETE = "products:delete" as const;
export const PRODUCTS_PUBLISH = "products:publish" as const;

// ---- Orders ----
export const ORDERS_READ = "orders:read" as const;
export const ORDERS_UPDATE = "orders:update" as const;
export const ORDERS_CANCEL = "orders:cancel" as const;
export const ORDERS_REFUND = "orders:refund" as const;

// ---- Customers ----
export const CUSTOMERS_READ = "customers:read" as const;
export const CUSTOMERS_UPDATE = "customers:update" as const;
export const CUSTOMERS_BAN = "customers:ban" as const;

// ---- Categories ----
export const CATEGORIES_CREATE = "categories:create" as const;
export const CATEGORIES_READ = "categories:read" as const;
export const CATEGORIES_UPDATE = "categories:update" as const;
export const CATEGORIES_DELETE = "categories:delete" as const;

// ---- Inventory ----
export const INVENTORY_READ = "inventory:read" as const;
export const INVENTORY_UPDATE = "inventory:update" as const;

// ---- Content ----
export const CONTENT_CREATE = "content:create" as const;
export const CONTENT_READ = "content:read" as const;
export const CONTENT_UPDATE = "content:update" as const;
export const CONTENT_DELETE = "content:delete" as const;
export const CONTENT_PUBLISH = "content:publish" as const;

// ---- Promotions ----
export const PROMOTIONS_CREATE = "promotions:create" as const;
export const PROMOTIONS_READ = "promotions:read" as const;
export const PROMOTIONS_UPDATE = "promotions:update" as const;
export const PROMOTIONS_DELETE = "promotions:delete" as const;

// ---- Support ----
export const SUPPORT_READ = "support:read" as const;
export const SUPPORT_RESPOND = "support:respond" as const;
export const SUPPORT_CLOSE = "support:close" as const;
export const SUPPORT_ESCALATE = "support:escalate" as const;

// ---- Settings ----
export const SETTINGS_READ = "settings:read" as const;
export const SETTINGS_UPDATE = "settings:update" as const;

// ---- Analytics ----
export const ANALYTICS_READ = "analytics:read" as const;

// ---- Roles ----
export const ROLES_CREATE = "roles:create" as const;
export const ROLES_READ = "roles:read" as const;
export const ROLES_UPDATE = "roles:update" as const;
export const ROLES_DELETE = "roles:delete" as const;

// ---------------------------------------------------------------------------
// Aggregated list of every permission in the system
// ---------------------------------------------------------------------------
export const ALL_PERMISSIONS: readonly string[] = [
  // products
  PRODUCTS_CREATE,
  PRODUCTS_READ,
  PRODUCTS_UPDATE,
  PRODUCTS_DELETE,
  PRODUCTS_PUBLISH,

  // orders
  ORDERS_READ,
  ORDERS_UPDATE,
  ORDERS_CANCEL,
  ORDERS_REFUND,

  // customers
  CUSTOMERS_READ,
  CUSTOMERS_UPDATE,
  CUSTOMERS_BAN,

  // categories
  CATEGORIES_CREATE,
  CATEGORIES_READ,
  CATEGORIES_UPDATE,
  CATEGORIES_DELETE,

  // inventory
  INVENTORY_READ,
  INVENTORY_UPDATE,

  // content
  CONTENT_CREATE,
  CONTENT_READ,
  CONTENT_UPDATE,
  CONTENT_DELETE,
  CONTENT_PUBLISH,

  // promotions
  PROMOTIONS_CREATE,
  PROMOTIONS_READ,
  PROMOTIONS_UPDATE,
  PROMOTIONS_DELETE,

  // support
  SUPPORT_READ,
  SUPPORT_RESPOND,
  SUPPORT_CLOSE,
  SUPPORT_ESCALATE,

  // settings
  SETTINGS_READ,
  SETTINGS_UPDATE,

  // analytics
  ANALYTICS_READ,

  // roles
  ROLES_CREATE,
  ROLES_READ,
  ROLES_UPDATE,
  ROLES_DELETE,
] as const;

// ---------------------------------------------------------------------------
// Resource-level wildcard helpers — expand `resource:*` into every concrete
// permission for that resource.
// ---------------------------------------------------------------------------
function permissionsForResource(resource: string): string[] {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${resource}:`));
}

// ---------------------------------------------------------------------------
// Default roles
// Key   = role name (display name stored in the DB)
// Value = array of permission strings (or `["*"]` for super admin)
// ---------------------------------------------------------------------------
export const DEFAULT_ROLES: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  // Full access — the wildcard is evaluated at runtime
  ["Super Admin", ["*"]],

  // Product Manager: products:*, categories:*, inventory:*
  [
    "Product Manager",
    [...permissionsForResource("products"), ...permissionsForResource("categories"), INVENTORY_READ, INVENTORY_UPDATE],
  ],

  // Order Manager: orders:*, customers:read, inventory:read
  ["Order Manager", [...permissionsForResource("orders"), CUSTOMERS_READ, INVENTORY_READ]],

  // Content Manager: content:*, categories:read
  ["Content Manager", [...permissionsForResource("content"), CATEGORIES_READ]],

  // Support Agent: support:*, customers:read, orders:read
  [
    "Support Agent",
    [...permissionsForResource("support"), CUSTOMERS_READ, ORDERS_READ],
  ],
]);
