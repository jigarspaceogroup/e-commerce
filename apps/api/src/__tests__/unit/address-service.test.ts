import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    address: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock error handlers
vi.mock("../../middleware/error-handler.js", () => ({
  badRequest: (msg: string) => Object.assign(new Error(msg), { statusCode: 400 }),
  notFound: (msg: string) => Object.assign(new Error(msg), { statusCode: 404 }),
}));

import {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
} from "../../services/address.js";
import { prisma } from "../../lib/prisma.js";

const USER_ID = "user-1";

const sampleAddress = {
  id: "addr-1",
  userId: USER_ID,
  label: "Home",
  recipientName: "Nael Mattar",
  streetLine1: "123 Main St",
  streetLine2: null,
  city: "Riyadh",
  region: "Riyadh",
  postalCode: "12345",
  country: "SA",
  phone: "+966500000000",
  deliveryInstructions: null,
  isDefault: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("Address Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listAddresses ─────────────────────────────────────────────────────────
  describe("listAddresses", () => {
    it("returns addresses sorted by isDefault desc, createdAt desc", async () => {
      const addresses = [
        { ...sampleAddress, id: "addr-1", isDefault: true },
        { ...sampleAddress, id: "addr-2", isDefault: false },
      ];
      vi.mocked(prisma.address.findMany).mockResolvedValueOnce(addresses as any);

      const result = await listAddresses(USER_ID);

      expect(result).toEqual(addresses);
      expect(prisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
    });

    it("returns empty array when user has no addresses", async () => {
      vi.mocked(prisma.address.findMany).mockResolvedValueOnce([]);

      const result = await listAddresses(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── getAddress ────────────────────────────────────────────────────────────
  describe("getAddress", () => {
    it("returns address for valid user and address id", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(sampleAddress as any);

      const result = await getAddress(USER_ID, "addr-1");

      expect(result).toEqual(sampleAddress);
      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: "addr-1", userId: USER_ID },
      });
    });

    it("throws 404 when address not found", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(getAddress(USER_ID, "addr-999")).rejects.toThrow("Address not found");
    });

    it("throws 404 when address belongs to different user", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(getAddress("other-user", "addr-1")).rejects.toThrow("Address not found");
    });
  });

  // ─── createAddress ─────────────────────────────────────────────────────────
  describe("createAddress", () => {
    const createData = {
      recipientName: "Nael Mattar",
      streetLine1: "123 Main St",
      city: "Riyadh",
      region: "Riyadh",
      postalCode: "12345",
      country: "SA",
      phone: "+966500000000",
    };

    it("creates address and returns it", async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        ...sampleAddress,
        isDefault: false,
      } as any);

      const result = await createAddress(USER_ID, createData);

      expect(result).toBeDefined();
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          recipientName: "Nael Mattar",
          isDefault: false,
        }),
      });
    });

    it("auto-sets isDefault for first address", async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        ...sampleAddress,
        isDefault: true,
      } as any);

      await createAddress(USER_ID, createData);

      expect(prisma.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isDefault: true,
        }),
      });
    });

    it("throws 400 when user already has 10 addresses", async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(10);

      await expect(createAddress(USER_ID, createData)).rejects.toThrow(
        "Maximum of 10 addresses allowed",
      );
      expect(prisma.address.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateAddress ─────────────────────────────────────────────────────────
  describe("updateAddress", () => {
    it("updates address fields and returns updated address", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(sampleAddress as any);
      const updated = { ...sampleAddress, city: "Jeddah" };
      vi.mocked(prisma.address.update).mockResolvedValueOnce(updated as any);

      const result = await updateAddress(USER_ID, "addr-1", { city: "Jeddah" });

      expect(result).toEqual(updated);
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: "addr-1" },
        data: { city: "Jeddah" },
      });
    });

    it("throws 404 when address not found", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(
        updateAddress(USER_ID, "addr-999", { city: "Jeddah" }),
      ).rejects.toThrow("Address not found");
      expect(prisma.address.update).not.toHaveBeenCalled();
    });

    it("throws 404 when address belongs to different user", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(
        updateAddress("other-user", "addr-1", { city: "Jeddah" }),
      ).rejects.toThrow("Address not found");
    });
  });

  // ─── deleteAddress ─────────────────────────────────────────────────────────
  describe("deleteAddress", () => {
    it("deletes address and returns it", async () => {
      const nonDefault = { ...sampleAddress, isDefault: false };
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(nonDefault as any);
      vi.mocked(prisma.address.delete).mockResolvedValueOnce(nonDefault as any);

      const result = await deleteAddress(USER_ID, "addr-1");

      expect(result).toEqual(nonDefault);
      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: "addr-1" } });
    });

    it("reassigns default to most recent when deleting default address", async () => {
      const defaultAddr = { ...sampleAddress, id: "addr-1", isDefault: true };
      const nextAddr = { ...sampleAddress, id: "addr-2", isDefault: false };

      vi.mocked(prisma.address.findFirst)
        .mockResolvedValueOnce(defaultAddr as any) // ownership check
        .mockResolvedValueOnce(nextAddr as any); // find most recent
      vi.mocked(prisma.address.delete).mockResolvedValueOnce(defaultAddr as any);
      vi.mocked(prisma.address.update).mockResolvedValueOnce({
        ...nextAddr,
        isDefault: true,
      } as any);

      await deleteAddress(USER_ID, "addr-1");

      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: "desc" },
      });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: "addr-2" },
        data: { isDefault: true },
      });
    });

    it("does not reassign default when deleting non-default address", async () => {
      const nonDefault = { ...sampleAddress, isDefault: false };
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(nonDefault as any);
      vi.mocked(prisma.address.delete).mockResolvedValueOnce(nonDefault as any);

      await deleteAddress(USER_ID, "addr-1");

      // findFirst should only be called once (ownership check), not for reassignment
      expect(prisma.address.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.address.update).not.toHaveBeenCalled();
    });

    it("does not reassign when deleting the last address", async () => {
      const defaultAddr = { ...sampleAddress, isDefault: true };

      vi.mocked(prisma.address.findFirst)
        .mockResolvedValueOnce(defaultAddr as any) // ownership check
        .mockResolvedValueOnce(null as any); // no remaining addresses
      vi.mocked(prisma.address.delete).mockResolvedValueOnce(defaultAddr as any);

      await deleteAddress(USER_ID, "addr-1");

      expect(prisma.address.update).not.toHaveBeenCalled();
    });

    it("throws 404 when address not found", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(deleteAddress(USER_ID, "addr-999")).rejects.toThrow(
        "Address not found",
      );
      expect(prisma.address.delete).not.toHaveBeenCalled();
    });
  });

  // ─── setDefault ────────────────────────────────────────────────────────────
  describe("setDefault", () => {
    it("atomically clears all defaults and sets new default", async () => {
      vi.mocked(prisma.address.findFirst)
        .mockResolvedValueOnce(sampleAddress as any) // ownership check
        .mockResolvedValueOnce({ ...sampleAddress, isDefault: true } as any); // return updated
      vi.mocked(prisma.$transaction).mockResolvedValueOnce(undefined as any);

      const result = await setDefault(USER_ID, "addr-1");

      expect(prisma.$transaction).toHaveBeenCalledWith([
        prisma.address.updateMany({
          where: { userId: USER_ID },
          data: { isDefault: false },
        }),
        prisma.address.update({
          where: { id: "addr-1" },
          data: { isDefault: true },
        }),
      ]);
      expect(result).toEqual(expect.objectContaining({ isDefault: true }));
    });

    it("throws 404 when address not found", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(setDefault(USER_ID, "addr-999")).rejects.toThrow(
        "Address not found",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws 404 when address belongs to different user", async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null as any);

      await expect(setDefault("other-user", "addr-1")).rejects.toThrow(
        "Address not found",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
