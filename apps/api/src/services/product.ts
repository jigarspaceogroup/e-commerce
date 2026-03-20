import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/error-handler.js";
import { getRedisClient } from "./redis.js";
import { enqueueProductIndex, enqueueProductDelete } from "../jobs/product-sync.js";
import type { Prisma } from "../generated/prisma/client.js";

const PRODUCT_CACHE_PREFIX = "product:detail:";
const PRODUCT_CACHE_TTL = 300;

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const productInclude = {
  category: { select: { id: true, nameEn: true, nameAr: true, slug: true } },
  variants: { orderBy: { createdAt: "asc" as const } },
  images: { orderBy: { sortOrder: "asc" as const } },
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────
export async function createProduct(data: {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  compareAtPrice?: number | null;
  brand?: string;
  weight?: number;
  dimensions?: unknown;
  slug?: string;
  categoryId: string;
  seoTitleEn?: string;
  seoTitleAr?: string;
  seoDescriptionEn?: string;
  seoDescriptionAr?: string;
  specifications?: Record<string, unknown>;
  faq?: unknown;
}) {
  const slug = data.slug || generateSlug(data.titleEn);

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) throw badRequest(`Product with slug "${slug}" already exists`);

  // Verify category exists
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw badRequest("Category not found");

  const product = await prisma.product.create({
    data: {
      titleEn: data.titleEn,
      titleAr: data.titleAr,
      descriptionEn: data.descriptionEn,
      descriptionAr: data.descriptionAr,
      basePrice: data.basePrice,
      compareAtPrice: data.compareAtPrice ?? null,
      brand: data.brand,
      weight: data.weight,
      dimensions: data.dimensions ? JSON.parse(JSON.stringify(data.dimensions)) : undefined,
      slug,
      categoryId: data.categoryId,
      seoTitleEn: data.seoTitleEn,
      seoTitleAr: data.seoTitleAr,
      seoDescriptionEn: data.seoDescriptionEn,
      seoDescriptionAr: data.seoDescriptionAr,
      specifications: data.specifications ? JSON.parse(JSON.stringify(data.specifications)) : undefined,
      faq: data.faq ? JSON.parse(JSON.stringify(data.faq)) : undefined,
      status: "draft",
    },
    include: productInclude,
  });

  return product;
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: productInclude,
  });
  if (!product) throw notFound("Product not found");
  return product;
}

export async function listProducts(filters: {
  status?: string;
  categoryId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}) {
  const { status, categoryId, search, sortBy = "createdAt", sortOrder = "desc", cursor, limit = 20 } = filters;

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (status) where.status = status as Prisma.ProductWhereInput["status"];
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { titleEn: { contains: search, mode: "insensitive" } },
      { titleAr: { contains: search, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      category: { select: { id: true, nameEn: true, nameAr: true } },
      variants: { select: { id: true, sku: true, stockQuantity: true, priceOverride: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });

  const hasMore = products.length > limit;
  const data = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const existing = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: productInclude,
  });
  if (!existing) throw notFound("Product not found");

  // Handle slug change
  if (data.slug && data.slug !== existing.slug) {
    await prisma.slugRedirect.upsert({
      where: { oldSlug: existing.slug },
      create: { entityType: "product", oldSlug: existing.slug, newSlug: data.slug as string },
      update: { newSlug: data.slug as string },
    });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: data as Prisma.ProductUpdateInput,
    include: productInclude,
  });

  // Invalidate cache
  await invalidateProductCache(updated.slug);

  // Sync to Meilisearch if published
  if (updated.status === "published") {
    await syncProductToSearch(updated);
  }

  return { before: existing, after: updated };
}

export async function publishProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: { ...productInclude, _count: { select: { images: true } } },
  });
  if (!product) throw notFound("Product not found");

  // Validate required fields for publishing
  const errors: string[] = [];
  if (!product.titleEn || !product.titleAr) errors.push("Title (AR and EN) required");
  if (!product.basePrice) errors.push("Base price required");
  if (!product.categoryId) errors.push("Category required");
  if (product._count.images === 0) errors.push("At least one image required");
  if (product.variants.length === 0) errors.push("At least one variant with SKU required");

  if (errors.length > 0) {
    throw badRequest(`Cannot publish: ${errors.join("; ")}`);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { status: "published" },
    include: productInclude,
  });

  await invalidateProductCache(updated.slug);
  await syncProductToSearch(updated);

  return updated;
}

export async function archiveProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id, deletedAt: null } });
  if (!product) throw notFound("Product not found");

  const updated = await prisma.product.update({
    where: { id },
    data: { status: "archived" },
    include: productInclude,
  });

  await invalidateProductCache(updated.slug);
  await enqueueProductDelete(id);

  return updated;
}

export async function softDeleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id, deletedAt: null } });
  if (!product) throw notFound("Product not found");

  const updated = await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await invalidateProductCache(product.slug);
  await enqueueProductDelete(id);

  return updated;
}

// ─── Cache helpers ──────────────────────────────────────────────────────────
async function invalidateProductCache(slug: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(`${PRODUCT_CACHE_PREFIX}${slug}`);
  } catch { /* gracefully degrade */ }
}

// ─── Meilisearch sync helper ────────────────────────────────────────────────
async function syncProductToSearch(product: Record<string, unknown>): Promise<void> {
  try {
    const variants = product.variants as Array<Record<string, unknown>> | undefined;
    const firstVariant = variants?.[0];
    await enqueueProductIndex({
      id: product.id as string,
      titleEn: product.titleEn as string,
      titleAr: product.titleAr as string,
      descriptionEn: (product.descriptionEn as string).slice(0, 500),
      descriptionAr: (product.descriptionAr as string).slice(0, 500),
      slug: product.slug as string,
      basePrice: Number(product.basePrice),
      brand: (product.brand as string) || "",
      categoryId: product.categoryId as string,
      status: product.status as string,
      sku: (firstVariant?.sku as string) || "",
      inStock: variants ? variants.some((v) => (v.stockQuantity as number) > 0) : false,
      createdAt: (product.createdAt as Date).toISOString(),
    });
  } catch {
    console.error("Failed to enqueue product for search indexing");
  }
}

// ─── Public endpoints ───────────────────────────────────────────────────────
export async function listPublicProducts(filters: {
  categoryId?: string;
  categorySlug?: string;
  priceMin?: number;
  priceMax?: number;
  brand?: string;
  inStock?: boolean;
  sortBy?: string;
  cursor?: string;
  limit?: number;
}) {
  const { categoryId, categorySlug, priceMin, priceMax, brand, inStock, sortBy = "newest", cursor, limit = 20 } = filters;

  const where: Prisma.ProductWhereInput = {
    status: "published",
    deletedAt: null,
  };

  // Category filter (by ID or slug, slug includes subcategories)
  if (categoryId) {
    where.categoryId = categoryId;
  } else if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (category) {
      const subcategories = await prisma.category.findMany({
        where: { materializedPath: { startsWith: `${category.materializedPath ?? "/"}${category.id}/` } },
        select: { id: true },
      });
      const categoryIds = [category.id, ...subcategories.map((c) => c.id)];
      where.categoryId = { in: categoryIds };
    }
  }

  if (brand) where.brand = brand;
  if (priceMin !== undefined || priceMax !== undefined) {
    where.basePrice = {
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    };
  }
  if (inStock) {
    where.variants = { some: { stockQuantity: { gt: 0 } } };
  }

  // Sorting
  let orderBy: Prisma.ProductOrderByWithRelationInput;
  switch (sortBy) {
    case "price_asc": orderBy = { basePrice: "asc" }; break;
    case "price_desc": orderBy = { basePrice: "desc" }; break;
    case "newest": orderBy = { createdAt: "desc" }; break;
    default: orderBy = { createdAt: "desc" };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      category: { select: { id: true, nameEn: true, nameAr: true, slug: true } },
      variants: { select: { id: true, priceOverride: true, stockQuantity: true, attributes: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });

  const hasMore = products.length > limit;
  const data = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}

export async function getPublicProductBySlug(slug: string) {
  // Check cache
  try {
    const redis = getRedisClient();
    const cached = await redis.get(`${PRODUCT_CACHE_PREFIX}${slug}`);
    if (cached) return JSON.parse(cached);
  } catch { /* fall through */ }

  const product = await prisma.product.findUnique({
    where: { slug, status: "published", deletedAt: null },
    include: {
      ...productInclude,
      category: {
        select: {
          id: true, nameEn: true, nameAr: true, slug: true,
          parent: { select: { id: true, nameEn: true, nameAr: true, slug: true,
            parent: { select: { id: true, nameEn: true, nameAr: true, slug: true } },
          }},
        },
      },
    },
  });

  if (!product) {
    // Check redirect
    const redirect = await prisma.slugRedirect.findUnique({ where: { oldSlug: slug } });
    if (redirect) return { redirect: redirect.newSlug };
    throw notFound("Product not found");
  }

  // Cache
  try {
    const redis = getRedisClient();
    await redis.set(`${PRODUCT_CACHE_PREFIX}${slug}`, JSON.stringify(product), "EX", PRODUCT_CACHE_TTL);
  } catch { /* gracefully degrade */ }

  return product;
}
