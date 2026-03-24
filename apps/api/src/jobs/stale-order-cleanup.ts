import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "../lib/prisma.js";

const QUEUE_NAME = "stale-order-cleanup";
const STALE_MINUTES = 30;

export async function cleanupStaleOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: { status: "pending_payment", createdAt: { lt: cutoff } },
    include: { items: true },
  });

  for (const order of staleOrders) {
    for (const item of order.items) {
      await prisma.productVariant.update({
        where: { id: item.productVariantId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: "pending_payment",
        toStatus: "cancelled",
        notes: "Payment timeout — stock released",
      },
    });
  }

  if (staleOrders.length > 0) {
    console.info(`[STALE_ORDER_CLEANUP] Cancelled ${staleOrders.length} stale orders`);
  }
}

export function createStaleOrderCleanupQueue(redisUrl: string): Queue {
  const connection = { url: redisUrl };
  const queue = new Queue(QUEUE_NAME, { connection });
  queue.add("cleanup", {}, { repeat: { every: 15 * 60 * 1000 } });
  return queue;
}

export function createStaleOrderCleanupWorker(redisUrl: string): Worker {
  const connection = { url: redisUrl };
  return new Worker(QUEUE_NAME, async (_job: Job) => cleanupStaleOrders(), { connection });
}
