import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { recordAuditLog, queryAuditLogs } from "../../services/audit-log.js";
import { prisma } from "../../lib/prisma.js";

describe("Audit Log Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordAuditLog", () => {
    it("creates an audit log record", async () => {
      const input = {
        actorId: "user-1",
        actorIp: "127.0.0.1",
        action: "user.login",
        entityType: "user",
        entityId: "user-1",
      };

      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({
        id: "log-1",
        ...input,
        beforeValue: null,
        afterValue: null,
        notes: null,
        createdAt: new Date(),
      } as any);

      await recordAuditLog(input);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: "user-1",
          action: "user.login",
          entityType: "user",
        }),
      });
    });

    it("handles before/after values", async () => {
      const input = {
        actorId: "admin-1",
        actorIp: "10.0.0.1",
        action: "product.update",
        entityType: "product",
        entityId: "prod-1",
        beforeValue: { name: "Old" },
        afterValue: { name: "New" },
        notes: "Name changed",
      };

      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({
        id: "log-2",
        ...input,
        createdAt: new Date(),
      } as any);

      await recordAuditLog(input);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          beforeValue: { name: "Old" },
          afterValue: { name: "New" },
          notes: "Name changed",
        }),
      });
    });
  });

  describe("queryAuditLogs", () => {
    it("queries without filters", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce([]);
      const result = await queryAuditLogs({});
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          take: 21,
        }),
      );
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it("applies filters", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce([]);
      await queryAuditLogs({ actorId: "user-1", action: "user.login" });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actorId: "user-1",
            action: "user.login",
          }),
        }),
      );
    });

    it("handles pagination with hasMore flag", async () => {
      const mockLogs = Array.from({ length: 21 }, (_, i) => ({
        id: `log-${i}`,
        actorId: "user-1",
        action: "test",
        createdAt: new Date(),
      }));

      vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce(
        mockLogs as any,
      );
      const result = await queryAuditLogs({});
      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(20);
      expect(result.nextCursor).toBe("log-19");
    });

    it("handles cursor-based pagination", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce([]);
      await queryAuditLogs({}, "cursor-id");
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "cursor-id" },
          skip: 1,
        }),
      );
    });
  });
});
