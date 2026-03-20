import "dotenv/config";
import { app } from "./app.js";
import { createRedisClient } from "./services/redis.js";
import { createSearchClient, initProductIndex } from "./services/search.js";
import { createProductSyncQueue, createProductSyncWorker } from "./jobs/product-sync.js";
import { env } from "./config/env.js";

const PORT = env.PORT;

// Initialize Redis
createRedisClient(env.REDIS_URL);

// Initialize Meilisearch (degraded mode if unavailable)
try {
  createSearchClient(env.MEILISEARCH_HOST, env.MEILISEARCH_API_KEY);
  await initProductIndex();
  console.info("Meilisearch initialized");
} catch (err) {
  console.warn("Meilisearch unavailable — search will return empty results:", (err as Error).message);
}

// Initialize BullMQ product sync
try {
  createProductSyncQueue(env.REDIS_URL);
  createProductSyncWorker(env.REDIS_URL);
  console.info("Product sync worker started");
} catch (err) {
  console.warn("Product sync worker failed to start:", (err as Error).message);
}

app.listen(PORT, () => {
  console.info(`API server running on http://localhost:${PORT}`);
  console.info(`Health check: http://localhost:${PORT}/api/v1/health`);
});
