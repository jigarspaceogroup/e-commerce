import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/error-handler.js";
import { enqueueProductIndex } from "../jobs/product-sync.js";
import type { Prisma } from "../generated/prisma/client.js";

export async function listInventory(filters: {
  status?: string;
  categoryId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  const { status = "all", categoryId, search, cursor, limit = 20 } = filters;

  const where: Prisma.ProductVariantWhereInput = {};

  // For out_of_stock, we can use standard where
  if (status === "out_of_stock") {
    where.stockQuantity = 0;
  }

  if (categoryId) {
    where.product = { categoryId, deletedAt: null };
  } else {
    where.product = { deletedAt: null };
  }

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { product: { titleEn: { contains: search, mode: "insensitive" } } },
      { product: { titleAr: { contains: search, mode: "insensitive" } } },
    ];
  }

  // For low_stock, fetch more than needed and filter in JS
  const fetchLimit = status === "low_stock" ? (limit + 1) * 3 : limit + 1;

  const variants = await prisma.productVariant.findMany({
    where,
    take: fetchLimit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      product: { select: { id: true, titleEn: true, titleAr: true, status: true } },
    },
    orderBy: { sku: "asc" },
  });

  // Post-query filter for low_stock (Prisma can't compare columns)
  let filtered = variants;
  if (status === "low_stock") {
    filtered = variants.filter((v) =>
      v.stockQuantity > 0 && (
        (v.lowStockThreshold !== null && v.stockQuantity <= v.lowStockThreshold) ||
        (v.safetyStock > 0 && v.stockQuantity <= v.safetyStock)
      ),
    );
  }

  const hasMore = filtered.length > limit;
  const data = hasMore ? filtered.slice(0, limit) : filtered;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}

export async function updateStock(
  variantId: string,
  stockQuantity: number,
  reason: string,
  performedBy: string,
  notes?: string,
) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw notFound("Variant not found");

  if (stockQuantity < 0) throw badRequest("Stock quantity cannot be negative");

  const quantityChange = stockQuantity - variant.stockQuantity;

  const [updated] = await prisma.$transaction([
    prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity },
    }),
    prisma.inventoryMovement.create({
      data: {
        productVariantId: variantId,
        movementType: "manual_adjustment",
        quantityChange,
        quantityAfter: stockQuantity,
        referenceType: "manual",
        referenceId: variantId,
        reason: `${reason}${notes ? `: ${notes}` : ""}`,
        performedBy,
      },
    }),
  ]);

  // Re-index product to update inStock flag in Meilisearch
  await syncProductAfterStockChange(variant.productId);

  return updated;
}

async function syncProductAfterStockChange(productId: string): Promise<void> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId, status: "published", deletedAt: null },
      include: {
        variants: { select: { sku: true, stockQuantity: true } },
      },
    });

    if (!product) return; // Not published or deleted, no need to sync

    await enqueueProductIndex({
      id: product.id,
      titleEn: product.titleEn,
      titleAr: product.titleAr,
      descriptionEn: (product.descriptionEn ?? "").slice(0, 500),
      descriptionAr: (product.descriptionAr ?? "").slice(0, 500),
      slug: product.slug,
      basePrice: Number(product.basePrice),
      brand: product.brand || "",
      categoryId: product.categoryId,
      status: product.status,
      sku: product.variants[0]?.sku || "",
      inStock: product.variants.some((v) => v.stockQuantity > 0),
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Failed to sync product after stock change:", err);
  }
}

export async function getInventorySummary() {
  const [total, inStock, lowStock, outOfStock] = await Promise.all([
    prisma.productVariant.count({ where: { product: { deletedAt: null } } }),
    prisma.productVariant.count({ where: { stockQuantity: { gt: 0 }, product: { deletedAt: null } } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE p.deleted_at IS NULL
      AND pv.stock_quantity > 0
      AND (
        (pv.low_stock_threshold IS NOT NULL AND pv.stock_quantity <= pv.low_stock_threshold)
        OR (pv.safety_stock > 0 AND pv.stock_quantity <= pv.safety_stock)
      )
    `,
    prisma.productVariant.count({ where: { stockQuantity: 0, product: { deletedAt: null } } }),
  ]);

  return {
    total,
    inStock,
    lowStock: Number(lowStock[0]?.count ?? 0),
    outOfStock,
  };
}
