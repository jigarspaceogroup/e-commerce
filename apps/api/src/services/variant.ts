import { prisma } from "../lib/prisma.js";
import { notFound, conflict } from "../middleware/error-handler.js";

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

  return prisma.productVariant.update({
    where: { id: variantId },
    data: data as Record<string, unknown>,
  });
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
  const result = await prisma.$executeRaw`
    UPDATE product_variants
    SET stock_quantity = stock_quantity - ${quantity},
        updated_at = NOW()
    WHERE id = ${variantId}::uuid AND stock_quantity >= ${quantity}
  `;
  return result > 0;
}
