import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../lib/prisma.js";

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    order: { findMany: vi.fn(), update: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    productVariant: { update: vi.fn() },
  },
}));

describe("Stale order cleanup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels orders older than 30 min with pending_payment status and restores stock", async () => {
    const staleOrder = {
      id: "order-1",
      status: "pending_payment",
      createdAt: new Date(Date.now() - 31 * 60 * 1000),
      items: [
        { productVariantId: "var-1", quantity: 2 },
        { productVariantId: "var-2", quantity: 1 },
      ],
    };
    vi.mocked(prisma.order.findMany).mockResolvedValue([staleOrder] as any);
    vi.mocked(prisma.productVariant.update).mockResolvedValue({} as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(prisma.orderStatusHistory.create).mockResolvedValue({} as any);

    const { cleanupStaleOrders } = await import("../../jobs/stale-order-cleanup.js");
    await cleanupStaleOrders();

    expect(prisma.productVariant.update).toHaveBeenCalledTimes(2);
    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: "var-1" },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "cancelled" },
    });
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order-1",
          fromStatus: "pending_payment",
          toStatus: "cancelled",
        }),
      }),
    );
  });

  it("does nothing when no stale orders exist", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const { cleanupStaleOrders } = await import("../../jobs/stale-order-cleanup.js");
    await cleanupStaleOrders();

    expect(prisma.productVariant.update).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
