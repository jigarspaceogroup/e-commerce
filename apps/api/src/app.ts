import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { requestId } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/logger.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";

import { healthRouter } from "./routes/health.js";
import { v1Router } from "./routes/v1/index.js";
import { docsRouter } from "./routes/docs.js";

const app: Express = express();

// ── 1. Request ID ─────────────────────────────────────────────────────────
app.use(requestId);

// ── 2. Structured logging (pino-http) ─────────────────────────────────────
app.use(requestLogger);

// ── 3. Security headers ───────────────────────────────────────────────────
app.use(helmet());

// ── 4. CORS (storefront + admin origins) ──────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN_STOREFRONT ?? "http://localhost:3000",
      process.env.CORS_ORIGIN_ADMIN ?? "http://localhost:3001",
    ],
    credentials: true,
  }),
);

// ── 5. Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── 6. Cookie parsing ────────────────────────────────────────────────────
app.use(cookieParser());

// ── 7. Routes ────────────────────────────────────────────────────────────
app.use("/api/v1", healthRouter);
app.use("/api/v1", v1Router);

// Swagger docs (disabled in production)
if (process.env.NODE_ENV !== "production") {
  app.use("/api", docsRouter);
}

// ── 8. 404 handler for unmatched routes ──────────────────────────────────
app.use(notFoundHandler);

// ── 9. Centralised error handler (MUST be last) ──────────────────────────
app.use(errorHandler);

export { app };
