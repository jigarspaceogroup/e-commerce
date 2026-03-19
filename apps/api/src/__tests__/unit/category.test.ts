import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
    },
    slugRedirect: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock Redis
const mockRedis = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
vi.mock("../../services/redis.js", () => ({
  getRedisClient: () => mockRedis,
}));

import {
  createCategory,
  getCategoryById,
  listCategories,
  updateCategory,
  deleteCategory,
  getCachedCategoryTree,
  getCategoryBySlug,
} from "../../services/category.js";
import { prisma } from "../../lib/prisma.js";

describe("Category Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createCategory ────────────────────────────────────────────────────────
  describe("createCategory", () => {
    it("generates slug from name when slug not provided", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any); // slug check
      vi.mocked(prisma.category.create).mockResolvedValueOnce({
        id: "cat-1",
        nameEn: "Summer Collection",
        slug: "summer-collection",
        materializedPath: "/",
      } as any);

      await createCategory({ nameEn: "Summer Collection", nameAr: "مجموعة الصيف" });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "summer-collection",
          }),
        }),
      );
    });

    it("throws badRequest when slug already exists", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({ id: "existing" } as any);

      await expect(
        createCategory({ nameEn: "Test", nameAr: "تست", slug: "taken-slug" }),
      ).rejects.toThrow('Category with slug "taken-slug" already exists');
    });

    it("computes materialized path for root category", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any); // slug check
      vi.mocked(prisma.category.create).mockResolvedValueOnce({ id: "cat-1" } as any);

      await createCategory({ nameEn: "Root", nameAr: "جذر" });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            materializedPath: "/",
          }),
        }),
      );
    });

    it("computes materialized path for child category", async () => {
      // Slug uniqueness check
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);
      // Parent lookup in computeMaterializedPath
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "parent-1",
        materializedPath: "/",
      } as any);
      vi.mocked(prisma.category.create).mockResolvedValueOnce({ id: "cat-2" } as any);

      await createCategory({ nameEn: "Child", nameAr: "طفل", parentId: "parent-1" });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            materializedPath: "/parent-1/",
            parentId: "parent-1",
          }),
        }),
      );
    });

    it("throws badRequest when depth exceeds 4 levels", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any); // slug check
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "deep-parent",
        materializedPath: "/a/b/c/",
      } as any);

      await expect(
        createCategory({ nameEn: "Too Deep", nameAr: "عميق جدا", parentId: "deep-parent" }),
      ).rejects.toThrow("Maximum category hierarchy depth is 4 levels");
    });

    it("invalidates category cache after creation", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.category.create).mockResolvedValueOnce({ id: "cat-1" } as any);

      await createCategory({ nameEn: "Test", nameAr: "تست" });

      expect(mockRedis.del).toHaveBeenCalledWith("categories:tree");
    });
  });

  // ─── getCategoryById ────────────────────────────────────────────────────────
  describe("getCategoryById", () => {
    it("returns category with relations", async () => {
      const mockCategory = {
        id: "cat-1",
        nameEn: "Electronics",
        parent: null,
        children: [],
        _count: { products: 5 },
      };
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory as any);

      const result = await getCategoryById("cat-1");

      expect(result).toEqual(mockCategory);
      expect(prisma.category.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cat-1" },
          include: expect.objectContaining({
            parent: true,
            children: expect.any(Object),
          }),
        }),
      );
    });

    it("throws notFound when category does not exist", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);

      await expect(getCategoryById("non-existent")).rejects.toThrow("Category not found");
    });
  });

  // ─── listCategories ────────────────────────────────────────────────────────
  describe("listCategories", () => {
    it("returns flat list of categories", async () => {
      const mockCategories = [
        { id: "cat-1", nameEn: "A", parentId: null },
        { id: "cat-2", nameEn: "B", parentId: "cat-1" },
      ];
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories as any);

      const result = await listCategories("flat");

      expect(result).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
      );
    });

    it("returns tree format with nested children", async () => {
      const mockCategories = [
        { id: "cat-1", nameEn: "Root", parentId: null },
        { id: "cat-2", nameEn: "Child", parentId: "cat-1" },
      ];
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories as any);

      const result = await listCategories("tree");

      expect(result).toHaveLength(1);
      expect((result as any)[0].id).toBe("cat-1");
      expect((result as any)[0].children).toHaveLength(1);
      expect((result as any)[0].children[0].id).toBe("cat-2");
    });

    it("includes inactive categories when includeInactive is true", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      await listCategories("flat", true);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  // ─── updateCategory ────────────────────────────────────────────────────────
  describe("updateCategory", () => {
    it("creates slug redirect when slug changes", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        slug: "old-slug",
      } as any);
      vi.mocked(prisma.slugRedirect.upsert).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.category.update).mockResolvedValueOnce({
        id: "cat-1",
        slug: "new-slug",
      } as any);

      await updateCategory("cat-1", { slug: "new-slug" });

      expect(prisma.slugRedirect.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { oldSlug: "old-slug" },
          create: expect.objectContaining({
            entityType: "category",
            oldSlug: "old-slug",
            newSlug: "new-slug",
          }),
          update: { newSlug: "new-slug" },
        }),
      );
    });

    it("validates depth when parent changes", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        slug: "test",
      } as any);
      // Parent lookup for depth
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "deep-parent",
        materializedPath: "/a/b/c/",
      } as any);

      await expect(
        updateCategory("cat-1", { parentId: "deep-parent" }),
      ).rejects.toThrow("Maximum category hierarchy depth is 4 levels");
    });

    it("throws notFound when category does not exist", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);

      await expect(updateCategory("non-existent", { nameEn: "Updated" })).rejects.toThrow(
        "Category not found",
      );
    });

    it("invalidates cache after update", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        slug: "test",
      } as any);
      vi.mocked(prisma.category.update).mockResolvedValueOnce({ id: "cat-1" } as any);

      await updateCategory("cat-1", { nameEn: "Updated" });

      expect(mockRedis.del).toHaveBeenCalledWith("categories:tree");
    });
  });

  // ─── deleteCategory ────────────────────────────────────────────────────────
  describe("deleteCategory", () => {
    it("prevents delete when category has children and no reassignTo", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        children: [{ id: "child-1" }],
        _count: { products: 0 },
      } as any);

      await expect(deleteCategory("cat-1")).rejects.toThrow(
        "Category has 1 child categories. Provide reassignTo parameter.",
      );
    });

    it("prevents delete when category has products and no reassignTo", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        children: [],
        _count: { products: 3 },
      } as any);

      await expect(deleteCategory("cat-1")).rejects.toThrow(
        "Category has 3 products. Provide reassignTo parameter.",
      );
    });

    it("reassigns children and products then deletes when reassignTo provided", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        children: [{ id: "child-1" }],
        _count: { products: 2 },
      } as any);
      // Target lookup
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "target-cat",
      } as any);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce(undefined as any);

      await deleteCategory("cat-1", "target-cat");

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("deletes directly when no children or products", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        children: [],
        _count: { products: 0 },
      } as any);
      vi.mocked(prisma.category.delete).mockResolvedValueOnce({} as any);

      await deleteCategory("cat-1");

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    });

    it("throws notFound when category does not exist", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);

      await expect(deleteCategory("non-existent")).rejects.toThrow("Category not found");
    });

    it("throws badRequest when reassignTo target does not exist", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-1",
        children: [{ id: "child-1" }],
        _count: { products: 0 },
      } as any);
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);

      await expect(deleteCategory("cat-1", "bad-target")).rejects.toThrow(
        "Reassignment target category not found",
      );
    });
  });

  // ─── getCachedCategoryTree ─────────────────────────────────────────────────
  describe("getCachedCategoryTree", () => {
    it("returns cached version when available", async () => {
      const cachedTree = [{ id: "cat-1", nameEn: "Cached" }];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedTree));

      const result = await getCachedCategoryTree();

      expect(result).toEqual(cachedTree);
      expect(prisma.category.findMany).not.toHaveBeenCalled();
    });

    it("falls back to DB when cache is empty", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
        { id: "cat-1", nameEn: "Fresh", parentId: null },
      ] as any);

      const result = await getCachedCategoryTree();

      expect(prisma.category.findMany).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        "categories:tree",
        expect.any(String),
        "EX",
        300,
      );
      expect(result).toHaveLength(1);
    });

    it("falls back to DB when Redis throws", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Redis down"));
      vi.mocked(prisma.category.findMany).mockResolvedValueOnce([] as any);

      const result = await getCachedCategoryTree();

      expect(prisma.category.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // ─── getCategoryBySlug ─────────────────────────────────────────────────────
  describe("getCategoryBySlug", () => {
    it("returns category when found", async () => {
      const mockCategory = { id: "cat-1", slug: "electronics", _count: { products: 5 } };
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory as any);

      const result = await getCategoryBySlug("electronics");

      expect(result).toEqual(mockCategory);
    });

    it("returns redirect for old slug", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any); // category not found
      vi.mocked(prisma.slugRedirect.findUnique).mockResolvedValueOnce({
        oldSlug: "old-electronics",
        newSlug: "electronics",
      } as any);

      const result = await getCategoryBySlug("old-electronics");

      expect(result).toEqual({ redirect: "electronics" });
    });

    it("throws notFound when no category or redirect exists", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.slugRedirect.findUnique).mockResolvedValueOnce(null as any);

      await expect(getCategoryBySlug("non-existent")).rejects.toThrow("Category not found");
    });
  });
});
