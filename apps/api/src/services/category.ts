import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/error-handler.js";
import { getRedisClient } from "./redis.js";

const CATEGORY_CACHE_KEY = "categories:tree";
const CATEGORY_CACHE_TTL = 300; // 5 minutes

// ─── Slug generation ────────────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || `item-${Date.now()}`;
}

// ─── Materialized path ─────────────────────────────────────────────────────
async function computeMaterializedPath(parentId: string | null): Promise<string> {
  if (!parentId) return "/";
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) throw badRequest("Parent category not found");
  return `${parent.materializedPath ?? "/"}${parent.id}/`;
}

function getDepth(materializedPath: string): number {
  return materializedPath.split("/").filter(Boolean).length;
}

// ─── Cache invalidation ────────────────────────────────────────────────────
async function invalidateCategoryCache(): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(CATEGORY_CACHE_KEY);
  } catch {
    // Gracefully degrade if Redis unavailable
  }
}

// ─── CRUD ───────────────────────────────────────────────────────────────────
export async function createCategory(data: {
  nameEn: string;
  nameAr: string;
  slug?: string;
  parentId?: string | null;
  descriptionEn?: string;
  descriptionAr?: string;
  seoTitleEn?: string;
  seoTitleAr?: string;
  seoDescriptionEn?: string;
  seoDescriptionAr?: string;
  bannerImageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const slug = data.slug || generateSlug(data.nameEn);

  // Check slug uniqueness
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) throw badRequest(`Category with slug "${slug}" already exists`);

  // Validate parent and depth
  const materializedPath = await computeMaterializedPath(data.parentId ?? null);
  if (getDepth(materializedPath) >= 4) {
    throw badRequest("Maximum category hierarchy depth is 4 levels");
  }

  const category = await prisma.category.create({
    data: {
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      slug,
      parentId: data.parentId ?? null,
      descriptionEn: data.descriptionEn,
      descriptionAr: data.descriptionAr,
      seoTitleEn: data.seoTitleEn,
      seoTitleAr: data.seoTitleAr,
      seoDescriptionEn: data.seoDescriptionEn,
      seoDescriptionAr: data.seoDescriptionAr,
      bannerImageUrl: data.bannerImageUrl,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      materializedPath,
    },
    include: { children: true, _count: { select: { products: true } } },
  });

  await invalidateCategoryCache();
  return category;
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: { orderBy: { sortOrder: "asc" } },
      _count: { select: { products: true } },
    },
  });
  if (!category) throw notFound("Category not found");
  return category;
}

export async function listCategories(format: "flat" | "tree", includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };

  if (format === "flat") {
    return prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  // Tree: fetch all and build hierarchy in memory
  const all = await prisma.category.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return buildTree(all);
}

interface CategoryWithChildren {
  id: string;
  parentId: string | null;
  children?: CategoryWithChildren[];
  [key: string]: unknown;
}

function buildTree(categories: CategoryWithChildren[]): CategoryWithChildren[] {
  const map = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function updateCategory(id: string, data: Record<string, unknown>) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound("Category not found");

  // If slug is changing, create redirect
  if (data.slug && data.slug !== existing.slug) {
    await prisma.slugRedirect.upsert({
      where: { oldSlug: existing.slug },
      create: {
        entityType: "category",
        oldSlug: existing.slug,
        newSlug: data.slug as string,
      },
      update: { newSlug: data.slug as string },
    });
  }

  // If parent is changing, validate depth
  if (data.parentId !== undefined) {
    const newPath = await computeMaterializedPath(data.parentId as string | null);
    if (getDepth(newPath) >= 4) {
      throw badRequest("Maximum category hierarchy depth is 4 levels");
    }
    data.materializedPath = newPath;
  }

  const updated = await prisma.category.update({
    where: { id },
    data: data as Record<string, unknown>,
    include: { children: true, _count: { select: { products: true } } },
  });

  await invalidateCategoryCache();
  return { before: existing, after: updated };
}

export async function deleteCategory(id: string, reassignTo?: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      children: { select: { id: true } },
      _count: { select: { products: true } },
    },
  });
  if (!category) throw notFound("Category not found");

  // Check children
  if (category.children.length > 0 && !reassignTo) {
    throw badRequest(
      `Category has ${category.children.length} child categories. Provide reassignTo parameter.`,
    );
  }

  // Check products
  if (category._count.products > 0 && !reassignTo) {
    throw badRequest(
      `Category has ${category._count.products} products. Provide reassignTo parameter.`,
    );
  }

  // Reassign and delete in a single transaction
  if (reassignTo) {
    const target = await prisma.category.findUnique({ where: { id: reassignTo } });
    if (!target) throw badRequest("Reassignment target category not found");

    await prisma.$transaction([
      prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: reassignTo },
      }),
      prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: reassignTo },
      }),
      prisma.category.delete({ where: { id } }),
    ]);
  } else {
    await prisma.category.delete({ where: { id } });
  }

  await invalidateCategoryCache();
  return category;
}

// ─── Public (cached) ────────────────────────────────────────────────────────
export async function getCachedCategoryTree() {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(CATEGORY_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Fall through to DB query
  }

  const tree = await listCategories("tree", false);

  try {
    const redis = getRedisClient();
    await redis.set(CATEGORY_CACHE_KEY, JSON.stringify(tree), "EX", CATEGORY_CACHE_TTL);
  } catch {
    // Gracefully degrade
  }

  return tree;
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    // Check for redirect
    const redirect = await prisma.slugRedirect.findUnique({ where: { oldSlug: slug } });
    if (redirect) return { redirect: redirect.newSlug };
    throw notFound("Category not found");
  }
  return category;
}
