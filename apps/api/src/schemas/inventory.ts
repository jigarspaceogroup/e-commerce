import { z } from "zod";

export const updateStockSchema = z.object({
  stockQuantity: z.number().int().min(0),
  reason: z.enum([
    "manual_adjustment",
    "received_shipment",
    "cycle_count",
    "damaged",
    "returned",
  ]),
  notes: z.string().optional(),
});

export const inventoryListQuery = z.object({
  status: z.enum(["all", "low_stock", "out_of_stock"]).optional().default("all"),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.string().optional().default("20").transform(Number).pipe(z.number().int().min(1).max(100)),
});
