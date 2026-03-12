import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate, requirePermission } from "../../../middleware/auth.js";
import { queryAuditLogs, type AuditLogFilters } from "../../../services/audit-log.js";
import { sendSuccess } from "../../../utils/response.js";

const adminAuditLogRouter: IRouter = Router();

adminAuditLogRouter.get(
  "/",
  authenticate,
  requirePermission("audit_logs:read"),
  async (req: Request, res: Response) => {
    const filters: AuditLogFilters = {
      actorId: req.query.actorId as string | undefined,
      action: req.query.action as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const result = await queryAuditLogs(filters, cursor, limit);
    sendSuccess(res, {
      logs: result.data,
      pagination: { cursor: result.nextCursor, hasMore: result.hasMore, limit },
    });
  },
);

export { adminAuditLogRouter };
