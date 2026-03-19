import { prisma } from "../lib/prisma.js";
import { createSearchClient, initProductIndex, indexProducts } from "../services/search.js";
import type { ProductSearchDocument } from "../services/search.js";

async function reindexAllProducts() {
  const host = process.env.MEILISEARCH_HOST ?? "http://localhost:7700";
  const apiKey = process.env.MEILISEARCH_API_KEY ?? "masterKey";

  createSearchClient(host, apiKey);
  await initProductIndex();

  const batchSize = 100;
  let cursor: string | undefined;
  let total = 0;

  console.log("Starting full product re-index...");

  while (true) {
    const products = await prisma.product.findMany({
      where: { status: "published", deletedAt: null },
      take: batchSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        variants: { select: { sku: true, stockQuantity: true } },
      },
      orderBy: { id: "asc" },
    });

    const hasMore = products.length > batchSize;
    const batch = hasMore ? products.slice(0, batchSize) : products;

    if (batch.length === 0) break;

    const docs: ProductSearchDocument[] = batch.map((p) => ({
      id: p.id,
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      descriptionEn: (p.descriptionEn ?? "").slice(0, 500),
      descriptionAr: (p.descriptionAr ?? "").slice(0, 500),
      basePrice: Number(p.basePrice),
      brand: p.brand ?? "",
      slug: p.slug,
      status: p.status,
      categoryId: p.categoryId,
      averageRating: 0,
      inStock: p.variants.some((v) => v.stockQuantity > 0),
      sku: p.variants[0]?.sku ?? "",
      createdAt: p.createdAt.toISOString(),
    }));

    await indexProducts(docs);
    total += batch.length;
    console.log(`Indexed ${total} products...`);

    if (!hasMore) break;
    cursor = batch[batch.length - 1]!.id;
  }

  console.log(`Re-index complete. Total: ${total} products.`);
  process.exit(0);
}

reindexAllProducts().catch((err) => {
  console.error("Re-index failed:", err);
  process.exit(1);
});
