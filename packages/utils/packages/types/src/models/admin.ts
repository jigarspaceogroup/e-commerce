import { CMSContentStatus, CMSContentType } from "../enums";

export interface AuditLog {
  id: string;
  actorId: string;
  actorIp: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  notes: string | null;
  createdAt: Date;
}

export interface CMSContent {
  id: string;
  contentType: CMSContentType;
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string | Record<string, unknown>;
  bodyAr: string | Record<string, unknown>;
  status: CMSContentStatus;
  metadata: Record<string, unknown> | null;
  version: number;
  publishedBy: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CMSContentVersion {
  id: string;
  contentId: string;
  version: number;
  titleEn: string;
  titleAr: string;
  bodyEn: string | Record<string, unknown>;
  bodyAr: string | Record<string, unknown>;
  editedBy: string;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string | null;
}
