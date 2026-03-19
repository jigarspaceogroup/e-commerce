import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock product-sync jobs
vi.mock("../../jobs/product-sync.js", () => ({
  enqueueProductIndex: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
    },
    productVariant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

import {
  createVariant,
  updateVariant,
  deleteVariant,
  atomicStockDecrement,
} from "../../services/variant.js";
import { prisma } from "../../lib/prisma.js";

describe("Variant Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createVariant ─────────────────────────────────────────────────────────
  describe("createVariant", () => {
    it("creates variant with defaults", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({ id: "prod-1" } as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(null as any); // SKU check
      vi.mocked(prisma.productVariant.create).mockResolvedValueOnce({
        id: "var-1",
        productId: "prod-1",
        sku: "SKU-001",
        stockQuantity: 0,
        safetyStock: 0,
        backorderEnabled: false,
      } as any);

      const result = await createVariant("prod-1", { sku: "SKU-001" });

      expect(result.sku).toBe("SKU-001");
      expect(prisma.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: "prod-1",
            sku: "SKU-001",
            stockQuantity: 0,
            safetyStock: 0,
            backorderEnabled: false,
          }),
        }),
      );
    });

    it("throws conflict when SKU already exists", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({ id: "prod-1" } as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "existing",
        sku: "SKU-DUP",
      } as any);

      await expect(
        createVariant("prod-1", { sku: "SKU-DUP" }),
      ).rejects.toThrow('SKU "SKU-DUP" already exists');
    });

    it("throws notFound when product does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(
        createVariant("non-existent", { sku: "SKU-001" }),
      ).rejects.toThrow("Product not found");
    });

    it("creates variant with custom values", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({ id: "prod-1" } as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce(null as any);
      vi.mocked(prisma.productVariant.create).mockResolvedValueOnce({
        id: "var-1",
        productId: "prod-1",
        sku: "SKU-002",
        priceOverride: 49.99,
        stockQuantity: 100,
        safetyStock: 10,
        lowStockThreshold: 20,
        backorderEnabled: true,
      } as any);

      await createVariant("prod-1", {
        sku: "SKU-002",
        priceOverride: 49.99,
        stockQuantity: 100,
        safetyStock: 10,
        lowStockThreshold: 20,
        backorderEnabled: true,
      });

      expect(prisma.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priceOverride: 49.99,
            stockQuantity: 100,
            safetyStock: 10,
            lowStockThreshold: 20,
            backorderEnabled: true,
          }),
        }),
      );
    });
  });

  // ─── updateVariant ─────────────────────────────────────────────────────────
  describe("updateVariant", () => {
    it("updates variant fields", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValueOnce({
        id: "var-1",
        sku: "SKU-001",
      } as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValueOnce({
        id: "var-1",
        stockQuantity: 50,
      } as any);

      const result = await updateVariant("prod-1", "var-1", { stockQuantity: 50 });

      expect(result.stockQuantity).toBe(50);
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "var-1" },
          data: { stockQuantity: 50 },
        }),
      );
    });

    it("checks SKU uniqueness when SKU changes", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValueOnce({
        id: "var-1",
        sku: "SKU-001",
      } as any);
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "other",
        sku: "SKU-TAKEN",
      } as any);

      await expect(
        updateVariant("prod-1", "var-1", { sku: "SKU-TAKEN" }),
      ).rejects.toThrow('SKU "SKU-TAKEN" already exists');
    });

    it("throws notFound when variant does not exist", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValueOnce(null as any);

      await expect(
        updateVariant("prod-1", "non-existent", { stockQuantity: 10 }),
      ).rejects.toThrow("Variant not found");
    });
  });

  // ─── deleteVariant ─────────────────────────────────────────────────────────
  describe("deleteVariant", () => {
    it("deletes variant and returns it", async () => {
      const mockVariant = { id: "var-1", sku: "SKU-001" };
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValueOnce(mockVariant as any);
      vi.mocked(prisma.productVariant.delete).mockResolvedValueOnce(mockVariant as any);

      const result = await deleteVariant("prod-1", "var-1");

      expect(result).toEqual(mockVariant);
      expect(prisma.productVariant.delete).toHaveBeenCalledWith({
        where: { id: "var-1" },
      });
    });

    it("throws notFound when variant does not exist", async () => {
      vi.mocked(prisma.productVariant.findFirst).mockResolvedValueOnce(null as any);

      await expect(deleteVariant("prod-1", "non-existent")).rejects.toThrow(
        "Variant not found",
      );
    });
  });

  // ─── atomicStockDecrement ──────────────────────────────────────────────────
  describe("atomicStockDecrement", () => {
    it("returns true when stock is sufficient", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        productId: "prod-1",
        stockQuantity: 10,
      } as any);
      vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(1 as any);
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      const result = await atomicStockDecrement("var-1", 5);

      expect(result).toBe(true);
    });

    it("returns false when stock is insufficient", async () => {
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        productId: "prod-1",
        stockQuantity: 5,
      } as any);
      vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(0 as any);

      const result = await atomicStockDecrement("var-1", 100);

      expect(result).toBe(false);
    });
  });
});
