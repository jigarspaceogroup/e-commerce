import { z } from "zod";

export const customerListQuery = z.object({
  search: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.string().optional().default("20").transform(Number).pipe(z.number().int().min(1).max(100)),
});

export const customerIdParam = z.object({
  id: z.string().uuid(),
});
