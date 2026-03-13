import type { Request, Response, NextFunction } from "express";

export function ipAllowlist(req: Request, res: Response, next: NextFunction): void {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST ?? "";
  if (!allowlist) return next();

  const allowedIps = allowlist.split(",").map((ip) => ip.trim());
  const clientIp = req.ip ?? req.socket.remoteAddress ?? "";

  if (!allowedIps.includes(clientIp)) {
    console.warn(`[SECURITY] Admin access denied for IP: ${clientIp}`);
    res.status(403).json({
      success: false,
      data: null,
      error: { code: "IP_NOT_ALLOWED", message: "Access denied" },
    });
    return;
  }

  next();
}
