import "dotenv/config";
import { app } from "./app.js";
import { createRedisClient } from "./services/redis.js";

const PORT = process.env.PORT || 4000;

// Initialize Redis
createRedisClient(process.env.REDIS_URL ?? "redis://localhost:6379");

app.listen(PORT, () => {
  console.info(`API server running on http://localhost:${PORT}`);
  console.info(`Health check: http://localhost:${PORT}/api/v1/health`);
});
