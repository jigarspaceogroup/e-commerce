import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
    },
    productImage: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock sharp
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  uploadProductImage,
  updateProductImage,
  deleteProductImage,
} from "../../services/product-image.js";
import { prisma } from "../../lib/prisma.js";

describe("Product Image Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFile = {
    originalname: "photo.jpg",
    buffer: Buffer.from("fake-image-data"),
    mimetype: "image/jpeg",
  } as Express.Multer.File;

  // ─── uploadProductImage ────────────────────────────────────────────────────
  describe("uploadProductImage", () => {
    it("creates DB record and generates image variants", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
      } as any);
      vi.mocked(prisma.productImage.count).mockResolvedValueOnce(2 as any);
      vi.mocked(prisma.productImage.create).mockResolvedValueOnce({
        id: "img-1",
        productId: "prod-1",
        url: expect.any(String),
        sortOrder: 2,
      } as any);

      const result = await uploadProductImage("prod-1", mockFile, {
        altTextEn: "Widget photo",
      });

      expect(result.id).toBe("img-1");
      expect(prisma.productImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: "prod-1",
            altTextEn: "Widget photo",
            sortOrder: 2,
          }),
        }),
      );
    });

    it("throws notFound when product does not exist", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null as any);

      await expect(
        uploadProductImage("non-existent", mockFile, {}),
      ).rejects.toThrow("Product not found");
    });

    it("throws badRequest when max images exceeded", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
      } as any);
      vi.mocked(prisma.productImage.count).mockResolvedValueOnce(10 as any);

      await expect(
        uploadProductImage("prod-1", mockFile, {}),
      ).rejects.toThrow("Maximum 10 images per product");
    });

    it("uses sortOrder from data when provided", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
      } as any);
      vi.mocked(prisma.productImage.count).mockResolvedValueOnce(3 as any);
      vi.mocked(prisma.productImage.create).mockResolvedValueOnce({
        id: "img-1",
        sortOrder: 0,
      } as any);

      await uploadProductImage("prod-1", mockFile, { sortOrder: 0 });

      expect(prisma.productImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 0,
          }),
        }),
      );
    });
  });

  // ─── updateProductImage ────────────────────────────────────────────────────
  describe("updateProductImage", () => {
    it("updates image record", async () => {
      vi.mocked(prisma.productImage.findFirst).mockResolvedValueOnce({
        id: "img-1",
        productId: "prod-1",
      } as any);
      vi.mocked(prisma.productImage.update).mockResolvedValueOnce({
        id: "img-1",
        altTextEn: "Updated alt text",
      } as any);

      const result = await updateProductImage("prod-1", "img-1", {
        altTextEn: "Updated alt text",
      });

      expect(result.altTextEn).toBe("Updated alt text");
      expect(prisma.productImage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "img-1" },
          data: { altTextEn: "Updated alt text" },
        }),
      );
    });

    it("throws notFound when image does not exist", async () => {
      vi.mocked(prisma.productImage.findFirst).mockResolvedValueOnce(null as any);

      await expect(
        updateProductImage("prod-1", "non-existent", { altTextEn: "test" }),
      ).rejects.toThrow("Image not found");
    });
  });

  // ─── deleteProductImage ────────────────────────────────────────────────────
  describe("deleteProductImage", () => {
    it("deletes record and returns it", async () => {
      const mockImage = {
        id: "img-1",
        productId: "prod-1",
        url: "/uploads/products/prod-1/123-abc.jpg",
      };
      vi.mocked(prisma.productImage.findFirst).mockResolvedValueOnce(mockImage as any);
      vi.mocked(prisma.productImage.delete).mockResolvedValueOnce(mockImage as any);

      const result = await deleteProductImage("prod-1", "img-1");

      expect(result).toEqual(mockImage);
      expect(prisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: "img-1" },
      });
    });

    it("throws notFound when image does not exist", async () => {
      vi.mocked(prisma.productImage.findFirst).mockResolvedValueOnce(null as any);

      await expect(deleteProductImage("prod-1", "non-existent")).rejects.toThrow(
        "Image not found",
      );
    });
  });
});
