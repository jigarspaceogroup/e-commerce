import { Queue, Worker, type Job } from "bullmq";
import type { ProductSearchDocument } from "../services/search.js";
import { indexProducts, removeProductFromIndex } from "../services/search.js";

const QUEUE_NAME = "product-search-sync";

let syncQueue: Queue | null = null;

export function createProductSyncQueue(redisUrl: string): Queue {
  const connection = { url: redisUrl };
  syncQueue = new Queue(QUEUE_NAME, { connection });
  return syncQueue;
}

export function getProductSyncQueue(): Queue {
  if (!syncQueue) {
    throw new Error("Product sync queue not initialized.");
  }
  return syncQueue;
}

export function createProductSyncWorker(redisUrl: string): Worker {
  const connection = { url: redisUrl };

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { action, product } = job.data as {
        action: "index" | "delete";
        product?: ProductSearchDocument;
        productId?: string;
      };

      if (action === "index" && product) {
        await indexProducts([product]);
        console.info(`Indexed product ${product.id}`);
      } else if (action === "delete" && job.data.productId) {
        await removeProductFromIndex(job.data.productId as string);
        console.info(`Removed product ${job.data.productId} from index`);
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    console.error(`Product sync job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function enqueueProductIndex(product: ProductSearchDocument): Promise<void> {
  const queue = getProductSyncQueue();
  await queue.add("index-product", { action: "index", product });
}

export async function enqueueProductDelete(productId: string): Promise<void> {
  const queue = getProductSyncQueue();
  await queue.add("delete-product", { action: "delete", productId });
}
