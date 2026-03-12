import type { Request, Response, NextFunction } from "express";
import { recordAuditLog } from "../services/audit-log.js";

export function auditMiddleware(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (req.user && res.statusCode < 400) {
        recordAuditLog({
          actorId: req.user.sub,
          actorIp: req.ip ?? "unknown",
          action,
          entityType,
          entityId: req.params.id ?? "N/A",
          afterValue: body,
        }).catch((err) => console.error("[Audit] Failed:", err));
      }
      return originalJson(body);
    };
    next();
  };
}
