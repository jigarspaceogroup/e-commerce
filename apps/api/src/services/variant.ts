import { prisma } from "../lib/prisma.js";
import { notFound, conflict } from "../middleware/error-handler.js";
import { enqueueProductIndex } from "../jobs/product-sync.js";

export async function createVariant(productId: string, data: {
  sku: string;
  priceOverride?: number | null;
  stockQuantity?: number;
  safetyStock?: number;
  lowStockThreshold?: number | null;
  backorderEnabled?: boolean;
  weightOverride?: number | null;
  attributes?: Record<string, string>;
}) {
  // Verify product exists
  const product = await prisma.product.findUnique({ where: { id: productId, deletedAt: null } });
  if (!product) throw notFound("Product not found");

  // Check SKU uniqueness
  const existingSku = await prisma.productVariant.findUnique({ where: { sku: data.sku } });
  if (existingSku) throw conflict(`SKU "${data.sku}" already exists`);

  return prisma.productVariant.create({
    data: {
      productId,
      sku: data.sku,
      priceOverride: data.priceOverride ?? null,
      stockQuantity: data.stockQuantity ?? 0,
      safetyStock: data.safetyStock ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? null,
      backorderEnabled: data.backorderEnabled ?? false,
      weightOverride: data.weightOverride ?? null,
      attributes: data.attributes ?? {},
    },
  });
}

export async function updateVariant(productId: string, variantId: string, data: Record<string, unknown>) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!variant) throw notFound("Variant not found");

  // Check SKU uniqueness if changing
  if (data.sku && data.sku !== variant.sku) {
    const existingSku = await prisma.productVariant.findUnique({ where: { sku: data.sku as string } });
    if (existingSku) throw conflict(`SKU "${data.sku}" already exists`);
  }

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: data as Record<string, unknown>,
  });

  // Re-index product if stock changed (to update inStock flag)
  if ("stockQuantity" in data) {
    await syncProductAfterStockChange(productId);
  }

  return updated;
}

export async function deleteVariant(productId: string, variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!variant) throw notFound("Variant not found");

  await prisma.productVariant.delete({ where: { id: variantId } });
  return variant;
}

export async function atomicStockDecrement(variantId: string, quantity: number): Promise<boolean> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, stockQuantity: true },
  });
  if (!variant) return false;

  const result = await prisma.$executeRaw`
    UPDATE product_variants
    SET stock_quantity = stock_quantity - ${quantity},
        updated_at = NOW()
    WHERE id = ${variantId}::uuid AND stock_quantity >= ${quantity}
  `;

  const success = result > 0;

  // Re-index product if stock was decremented (to update inStock flag)
  if (success) {
    await syncProductAfterStockChange(variant.productId);
  }

  return success;
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
