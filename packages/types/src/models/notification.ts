import { NotificationChannel, NotificationStatus } from '../enums';

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  templateId?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  slug: string;
  channel: NotificationChannel;
  subjectTemplateAr?: string;
  subjectTemplateEn?: string;
  bodyTemplateAr: string;
  bodyTemplateEn: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
