import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { listCustomers, getCustomerById } from "../../services/customer.js";
import { prisma } from "../../lib/prisma.js";

describe("Customer Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listCustomers ─────────────────────────────────────────────────────────
  describe("listCustomers", () => {
    it("returns customers without filters", async () => {
      const mockUsers = [
        { id: "user-1", email: "buyer@example.com", firstName: "Ali", _count: { orders: 3 } },
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as any);

      const result = await listCustomers({});

      expect(result.data).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userRoles: { none: {} },
            deletedAt: null,
          }),
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("excludes users with roles (non-buyers)", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as any);

      await listCustomers({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userRoles: { none: {} },
          }),
        }),
      );
    });

    it("applies search filter on name, email, and phone", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as any);

      await listCustomers({ search: "ali" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: "ali", mode: "insensitive" } },
              { lastName: { contains: "ali", mode: "insensitive" } },
              { email: { contains: "ali", mode: "insensitive" } },
              { phone: { contains: "ali" } },
            ],
          }),
        }),
      );
    });

    it("applies date range filter", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as any);

      await listCustomers({ dateFrom: "2025-01-01", dateTo: "2025-12-31" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date("2025-01-01"),
              lte: new Date("2025-12-31"),
            },
          }),
        }),
      );
    });

    it("returns cursor pagination with hasMore flag", async () => {
      const mockUsers = Array.from({ length: 21 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
      }));
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as any);

      const result = await listCustomers({});

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe("user-19");
    });

    it("applies cursor for pagination", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as any);

      await listCustomers({ cursor: "cursor-id" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "cursor-id" },
          skip: 1,
        }),
      );
    });

    it("returns hasMore false when fewer results than limit", async () => {
      const mockUsers = [
        { id: "user-1", email: "a@example.com" },
        { id: "user-2", email: "b@example.com" },
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as any);

      const result = await listCustomers({});

      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  // ─── getCustomerById ───────────────────────────────────────────────────────
  describe("getCustomerById", () => {
    it("returns customer with addresses and orders", async () => {
      const mockUser = {
        id: "user-1",
        email: "buyer@example.com",
        firstName: "Ali",
        lastName: "Ahmed",
        addresses: [{ id: "addr-1", city: "Riyadh" }],
        orders: [{ id: "order-1", orderNumber: "ORD-001", status: "delivered" }],
        _count: { orders: 1 },
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any);

      const result = await getCustomerById("user-1");

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1", deletedAt: null },
          select: expect.objectContaining({
            addresses: true,
            orders: expect.any(Object),
            _count: { select: { orders: true } },
          }),
        }),
      );
    });

    it("throws notFound when customer does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as any);

      await expect(getCustomerById("non-existent")).rejects.toThrow("Customer not found");
    });
  });
});
