import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    slugRedirect: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock Redis
const mockRedis = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
vi.mock("../../services/redis.js", () => ({
  getRedisClient: () => mockRedis,
}));

// Mock product-sync
vi.mock("../../jobs/product-sync.js", () => ({
  enqueueProductIndex: vi.fn().mockResolvedValue(undefined),
  enqueueProductDelete: vi.fn().mockResolvedValue(undefined),
}));

import {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  publishProduct,
  archiveProduct,
  softDeleteProduct,
  listPublicProducts,
  getPublicProductBySlug,
} from "../../services/product.js";
import { prisma } from "../../lib/prisma.js";
import { enqueueProductIndex, enqueueProductDelete } from "../../jobs/product-sync.js";

describe("Product Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createProduct ─────────────────────────────────────────────────────────
  describe("createProduct", () => {
    const validInput = {
      titleEn: "Premium Widget",
      titleAr: "ودجة متميزة",
      descriptionEn: "A premium widget",
      descriptionAr: "ودجة متميزة",
      basePrice: 29.99,
      categoryId: "cat-1",
    };

    it("generates slug from title when slug not provided", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any); // slug check
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({ id: "cat-1" } as any);
      vi.mocked(prisma.product.create).mockResolvedValueOnce({
        id: "prod-1",
        slug: "premium-widget",
      } as any);

      await createProduct(validInput);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "premium-widget",
          }),
        }),
      );
    });

    it("throws badRequest when slug already exists", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({ id: "existing" } as any);

      await expect(
        createProduct({ ...validInput, slug: "taken-slug" }),
      ).rejects.toThrow('Product with slug "taken-slug" already exists');
    });

    it("throws badRequest when category does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any); // slug check
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);

      await expect(createProduct(validInput)).rejects.toThrow("Category not found");
    });

    it("creates product with status draft", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({ id: "cat-1" } as any);
      vi.mocked(prisma.product.create).mockResolvedValueOnce({ id: "prod-1" } as any);

      await createProduct(validInput);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "draft",
          }),
        }),
      );
    });
  });

  // ─── getProductById ────────────────────────────────────────────────────────
  describe("getProductById", () => {
    it("returns product with includes", async () => {
      const mockProduct = {
        id: "prod-1",
        titleEn: "Widget",
        category: { id: "cat-1" },
        variants: [],
        images: [],
      };
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockProduct as any);

      const result = await getProductById("prod-1");

      expect(result).toEqual(mockProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prod-1", deletedAt: null },
        }),
      );
    });

    it("throws notFound for deleted or missing product", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(getProductById("non-existent")).rejects.toThrow("Product not found");
    });
  });

  // ─── listProducts ──────────────────────────────────────────────────────────
  describe("listProducts", () => {
    it("applies status filter", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listProducts({ status: "published" });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "published",
            deletedAt: null,
          }),
        }),
      );
    });

    it("applies categoryId filter", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listProducts({ categoryId: "cat-1" });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: "cat-1",
          }),
        }),
      );
    });

    it("applies search filter on titleEn and titleAr", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listProducts({ search: "widget" });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { titleEn: { contains: "widget", mode: "insensitive" } },
              { titleAr: { contains: "widget", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("returns cursor pagination with hasMore flag", async () => {
      const mockProducts = Array.from({ length: 21 }, (_, i) => ({
        id: `prod-${i}`,
        titleEn: `Product ${i}`,
      }));
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(mockProducts as any);

      const result = await listProducts({});

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe("prod-19");
    });

    it("applies cursor for pagination", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listProducts({ cursor: "cursor-id" });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "cursor-id" },
          skip: 1,
        }),
      );
    });
  });

  // ─── updateProduct ─────────────────────────────────────────────────────────
  describe("updateProduct", () => {
    it("creates slug redirect when slug changes", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        slug: "old-slug",
        status: "draft",
        variants: [],
      } as any);
      vi.mocked(prisma.slugRedirect.upsert).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        id: "prod-1",
        slug: "new-slug",
        status: "draft",
      } as any);

      await updateProduct("prod-1", { slug: "new-slug" });

      expect(prisma.slugRedirect.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { oldSlug: "old-slug" },
          create: expect.objectContaining({
            entityType: "product",
            oldSlug: "old-slug",
            newSlug: "new-slug",
          }),
        }),
      );
    });

    it("invalidates cache after update", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        slug: "test-product",
        status: "draft",
        variants: [],
      } as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        id: "prod-1",
        slug: "test-product",
        status: "draft",
      } as any);

      await updateProduct("prod-1", { titleEn: "Updated" });

      expect(mockRedis.del).toHaveBeenCalledWith("product:detail:test-product");
    });

    it("throws notFound when product does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(updateProduct("non-existent", {})).rejects.toThrow("Product not found");
    });

    it("syncs to search when product is published", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        slug: "test",
        status: "published",
        variants: [{ sku: "SKU-1", stockQuantity: 10 }],
      } as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        id: "prod-1",
        slug: "test",
        status: "published",
        titleEn: "Test",
        titleAr: "تست",
        descriptionEn: "Desc",
        descriptionAr: "وصف",
        basePrice: 10,
        brand: "Brand",
        categoryId: "cat-1",
        createdAt: new Date(),
        variants: [{ sku: "SKU-1", stockQuantity: 10 }],
      } as any);

      await updateProduct("prod-1", { titleEn: "Updated" });

      expect(enqueueProductIndex).toHaveBeenCalled();
    });
  });

  // ─── publishProduct ────────────────────────────────────────────────────────
  describe("publishProduct", () => {
    it("publishes a valid product", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        titleEn: "Widget",
        titleAr: "ودجة",
        basePrice: 29.99,
        categoryId: "cat-1",
        slug: "widget",
        descriptionEn: "Desc",
        descriptionAr: "وصف",
        status: "draft",
        variants: [{ sku: "SKU-1", stockQuantity: 10 }],
        _count: { images: 1 },
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        id: "prod-1",
        status: "published",
        slug: "widget",
        titleEn: "Widget",
        titleAr: "ودجة",
        descriptionEn: "Desc",
        descriptionAr: "وصف",
        basePrice: 29.99,
        brand: "",
        categoryId: "cat-1",
        createdAt: new Date(),
        variants: [{ sku: "SKU-1", stockQuantity: 10 }],
      } as any);

      const result = await publishProduct("prod-1");

      expect(result.status).toBe("published");
      expect(enqueueProductIndex).toHaveBeenCalled();
    });

    it("throws badRequest when title is missing", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        titleEn: "",
        titleAr: "",
        basePrice: 29.99,
        categoryId: "cat-1",
        variants: [{ sku: "SKU-1" }],
        _count: { images: 1 },
      } as any);

      await expect(publishProduct("prod-1")).rejects.toThrow("Cannot publish");
    });

    it("throws badRequest when no images exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        titleEn: "Widget",
        titleAr: "ودجة",
        basePrice: 29.99,
        categoryId: "cat-1",
        variants: [{ sku: "SKU-1" }],
        _count: { images: 0 },
      } as any);

      await expect(publishProduct("prod-1")).rejects.toThrow("At least one image required");
    });

    it("throws badRequest when no variants exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        titleEn: "Widget",
        titleAr: "ودجة",
        basePrice: 29.99,
        categoryId: "cat-1",
        variants: [],
        _count: { images: 1 },
      } as any);

      await expect(publishProduct("prod-1")).rejects.toThrow(
        "At least one variant with SKU required",
      );
    });

    it("throws notFound when product does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(publishProduct("non-existent")).rejects.toThrow("Product not found");
    });
  });

  // ─── archiveProduct ────────────────────────────────────────────────────────
  describe("archiveProduct", () => {
    it("sets status to archived and removes from search index", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        slug: "widget",
        status: "published",
      } as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        id: "prod-1",
        slug: "widget",
        status: "archived",
      } as any);

      const result = await archiveProduct("prod-1");

      expect(result.status).toBe("archived");
      expect(enqueueProductDelete).toHaveBeenCalledWith("prod-1");
      expect(mockRedis.del).toHaveBeenCalledWith("product:detail:widget");
    });

    it("throws notFound when product does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(archiveProduct("non-existent")).rejects.toThrow("Product not found");
    });
  });

  // ─── softDeleteProduct ─────────────────────────────────────────────────────
  describe("softDeleteProduct", () => {
    it("sets deletedAt and removes from search index", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        slug: "widget",
      } as any);
      vi.mocked(prisma.product.update).mockResolvedValueOnce({
        id: "prod-1",
        deletedAt: new Date(),
      } as any);

      await softDeleteProduct("prod-1");

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(enqueueProductDelete).toHaveBeenCalledWith("prod-1");
      expect(mockRedis.del).toHaveBeenCalledWith("product:detail:widget");
    });

    it("throws notFound when product does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(softDeleteProduct("non-existent")).rejects.toThrow("Product not found");
    });
  });

  // ─── listPublicProducts ────────────────────────────────────────────────────
  describe("listPublicProducts", () => {
    it("only returns published products", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listPublicProducts({});

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "published",
            deletedAt: null,
          }),
        }),
      );
    });

    it("filters by category slug with subcategories", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        materializedPath: "/",
      } as any);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { id: "subcat-1" },
      ] as any);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listPublicProducts({ categorySlug: "electronics" });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: { in: ["cat-1", "subcat-1"] },
          }),
        }),
      );
    });

    it("filters by price range", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listPublicProducts({ priceMin: 10, priceMax: 100 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: { gte: 10, lte: 100 },
          }),
        }),
      );
    });

    it("filters by inStock", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([] as any);

      await listPublicProducts({ inStock: true });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            variants: { some: { stockQuantity: { gt: 0 } } },
          }),
        }),
      );
    });

    it("returns cursor pagination", async () => {
      const mockProducts = Array.from({ length: 21 }, (_, i) => ({
        id: `prod-${i}`,
      }));
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(mockProducts as any);

      const result = await listPublicProducts({});

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe("prod-19");
    });
  });

  // ─── getPublicProductBySlug ────────────────────────────────────────────────
  describe("getPublicProductBySlug", () => {
    it("returns cached product when available", async () => {
      const cachedProduct = { id: "prod-1", slug: "widget", titleEn: "Widget" };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedProduct));

      const result = await getPublicProductBySlug("widget");

      expect(result).toEqual(cachedProduct);
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
    });

    it("fetches from DB and caches when not in cache", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const mockProduct = {
        id: "prod-1",
        slug: "widget",
        titleEn: "Widget",
        status: "published",
      };
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockProduct as any);

      const result = await getPublicProductBySlug("widget");

      expect(result).toEqual(mockProduct);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "product:detail:widget",
        JSON.stringify(mockProduct),
        "EX",
        300,
      );
    });

    it("returns redirect for old slug", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.slugRedirect.findUnique).mockResolvedValueOnce({
        oldSlug: "old-widget",
        newSlug: "widget",
      } as any);

      const result = await getPublicProductBySlug("old-widget");

      expect(result).toEqual({ redirect: "widget" });
    });

    it("throws notFound when no product or redirect exists", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.slugRedirect.findUnique).mockResolvedValueOnce(null as any);

      await expect(getPublicProductBySlug("non-existent")).rejects.toThrow(
        "Product not found",
      );
    });
  });
});
