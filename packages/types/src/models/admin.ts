import { CMSContentStatus, CMSContentType } from '../enums';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CMSContent {
  id: string;
  type: CMSContentType;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  metadata?: Record<string, unknown>;
  status: CMSContentStatus;
  publishedAt?: Date;
  publishedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CMSContentVersion {
  id: string;
  contentId: string;
  version: number;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: Date;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  createdAt: Date;
}
