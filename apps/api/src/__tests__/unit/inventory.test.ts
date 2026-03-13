import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    productVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

import {
  listInventory,
  updateStock,
  getInventorySummary,
} from "../../services/inventory.js";
import { prisma } from "../../lib/prisma.js";

describe("Inventory Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listInventory ─────────────────────────────────────────────────────────
  describe("listInventory", () => {
    it("returns all variants with default filters", async () => {
      const mockVariants = [
        { id: "var-1", sku: "SKU-001", stockQuantity: 10, product: { titleEn: "Widget" } },
      ];
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce(mockVariants as any);

      const result = await listInventory({});

      expect(result.data).toEqual(mockVariants);
      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { deletedAt: null },
          }),
          orderBy: { sku: "asc" },
        }),
      );
    });

    it("filters out_of_stock variants", async () => {
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce([] as any);

      await listInventory({ status: "out_of_stock" });

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stockQuantity: 0,
          }),
        }),
      );
    });

    it("filters low_stock variants post-query", async () => {
      const mockVariants = [
        { id: "var-1", stockQuantity: 5, lowStockThreshold: 10, safetyStock: 0 },
        { id: "var-2", stockQuantity: 100, lowStockThreshold: 10, safetyStock: 0 },
        { id: "var-3", stockQuantity: 3, lowStockThreshold: null, safetyStock: 5 },
      ];
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce(mockVariants as any);

      const result = await listInventory({ status: "low_stock" });

      // var-1: 5 <= 10 (lowStockThreshold) -> low stock
      // var-2: 100 > 10 -> NOT low stock
      // var-3: 3 <= 5 (safetyStock) -> low stock
      expect(result.data).toHaveLength(2);
      expect(result.data.map((v: any) => v.id)).toEqual(["var-1", "var-3"]);
    });

    it("applies search filter on SKU and product title", async () => {
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce([] as any);

      await listInventory({ search: "widget" });

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { sku: { contains: "widget", mode: "insensitive" } },
              { product: { titleEn: { contains: "widget", mode: "insensitive" } } },
              { product: { titleAr: { contains: "widget", mode: "insensitive" } } },
            ],
          }),
        }),
      );
    });

    it("returns cursor pagination with hasMore flag", async () => {
      const mockVariants = Array.from({ length: 21 }, (_, i) => ({
        id: `var-${i}`,
        sku: `SKU-${String(i).padStart(3, "0")}`,
        stockQuantity: 10,
        lowStockThreshold: null,
        safetyStock: 0,
      }));
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce(mockVariants as any);

      const result = await listInventory({});

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe("var-19");
    });

    it("applies cursor for pagination", async () => {
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce([] as any);

      await listInventory({ cursor: "cursor-id" });

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "cursor-id" },
          skip: 1,
        }),
      );
    });

    it("filters by categoryId", async () => {
      vi.mocked(prisma.productVariant.findMany).mockResolvedValueOnce([] as any);

      await listInventory({ categoryId: "cat-1" });

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { categoryId: "cat-1", deletedAt: null },
          }),
        }),
      );
    });
  });

  // ─── updateStock ───────────────────────────────────────────────────────────
  describe("updateStock", () => {
    it("creates movement record in transaction", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "var-1",
        stockQuantity: 10,
      } as any);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([
        { id: "var-1", stockQuantity: 25 },
      ] as any);

      const result = await updateStock("var-1", 25, "restock", "admin-1", "Shipment arrived");

      expect(result).toEqual({ id: "var-1", stockQuantity: 25 });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("throws notFound when variant does not exist", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(null as any);

      await expect(
        updateStock("non-existent", 10, "restock", "admin-1"),
      ).rejects.toThrow("Variant not found");
    });

    it("throws badRequest for negative stock quantity", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "var-1",
        stockQuantity: 10,
      } as any);

      await expect(
        updateStock("var-1", -5, "adjustment", "admin-1"),
      ).rejects.toThrow("Stock quantity cannot be negative");
    });
  });

  // ─── getInventorySummary ───────────────────────────────────────────────────
  describe("getInventorySummary", () => {
    it("returns counts for all categories", async () => {
      vi.mocked(prisma.productVariant.count)
        .mockResolvedValueOnce(100 as any)   // total
        .mockResolvedValueOnce(80 as any)    // inStock
        .mockResolvedValueOnce(10 as any);   // outOfStock
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ count: BigInt(15) }] as any);

      const result = await getInventorySummary();

      expect(result).toEqual({
        total: 100,
        inStock: 80,
        lowStock: 15,
        outOfStock: 10,
      });
    });

    it("returns zero lowStock when queryRaw returns empty", async () => {
      vi.mocked(prisma.productVariant.count)
        .mockResolvedValueOnce(50 as any)
        .mockResolvedValueOnce(50 as any)
        .mockResolvedValueOnce(0 as any);
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{}] as any);

      const result = await getInventorySummary();

      expect(result.lowStock).toBe(0);
    });
  });
});
