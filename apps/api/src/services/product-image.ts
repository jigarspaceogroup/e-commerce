import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/error-handler.js";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads/products");
const MAX_IMAGES_PER_PRODUCT = 10;

const SIZES = {
  thumb: { width: 200, suffix: "-thumb" },
  medium: { width: 600, suffix: "-medium" },
  large: { width: 1200, suffix: "-large" },
} as const;

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadProductImage(
  productId: string,
  file: Express.Multer.File,
  data: { altTextEn?: string; altTextAr?: string; variantId?: string; sortOrder?: number },
) {
  // Check product exists
  const product = await prisma.product.findUnique({ where: { id: productId, deletedAt: null } });
  if (!product) throw notFound("Product not found");

  // Check image count
  const count = await prisma.productImage.count({ where: { productId } });
  if (count >= MAX_IMAGES_PER_PRODUCT) {
    throw badRequest(`Maximum ${MAX_IMAGES_PER_PRODUCT} images per product`);
  }

  // Save and resize
  const productDir = path.join(UPLOAD_DIR, productId);
  await ensureDir(productDir);

  const ext = path.extname(file.originalname);
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const originalName = `${baseName}${ext}`;

  // Save original
  await fs.writeFile(path.join(productDir, originalName), file.buffer);

  // Generate WebP variants
  for (const [, config] of Object.entries(SIZES)) {
    await sharp(file.buffer)
      .resize(config.width, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(productDir, `${baseName}${config.suffix}.webp`));
  }

  const url = `/uploads/products/${productId}/${originalName}`;

  const image = await prisma.productImage.create({
    data: {
      productId,
      variantId: data.variantId || null,
      url,
      altTextEn: data.altTextEn || null,
      altTextAr: data.altTextAr || null,
      sortOrder: data.sortOrder ?? count,
    },
  });

  return image;
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  data: { altTextEn?: string; altTextAr?: string; variantId?: string | null; sortOrder?: number },
) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw notFound("Image not found");

  return prisma.productImage.update({
    where: { id: imageId },
    data,
  });
}

export async function deleteProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw notFound("Image not found");

  // Delete files from disk
  try {
    const filename = path.basename(image.url);
    const baseName = filename.replace(path.extname(filename), "");
    const productDir = path.join(UPLOAD_DIR, productId);

    await fs.unlink(path.join(productDir, filename)).catch(() => {});
    for (const [, config] of Object.entries(SIZES)) {
      await fs.unlink(path.join(productDir, `${baseName}${config.suffix}.webp`)).catch(() => {});
    }
  } catch {
    // Files may not exist; continue with DB deletion
  }

  await prisma.productImage.delete({ where: { id: imageId } });
  return image;
}
