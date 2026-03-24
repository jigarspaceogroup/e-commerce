import { prisma } from "../lib/prisma.js";
import { notFound, unauthorized } from "../middleware/error-handler.js";

export async function getOrder(orderId: string, userId?: string, guestEmail?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: { select: { id: true, status: true, paymentMethod: true, amount: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) throw notFound("Order not found");

  if (order.userId) {
    if (userId !== order.userId) throw unauthorized("Not authorized to view this order");
  } else {
    if (!guestEmail || order.guestEmail !== guestEmail) {
      throw unauthorized("Not authorized to view this order");
    }
  }

  return order;
}

export async function listOrders(
  userId: string,
  cursor?: string,
  limit: number = 10,
  status?: string,
) {
  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      items: { take: 3 },
      payments: { select: { id: true, status: true }, take: 1 },
    },
  });

  const hasMore = orders.length > limit;
  const data = hasMore ? orders.slice(0, limit) : orders;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return { data, nextCursor };
}
