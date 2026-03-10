import { NotificationChannel, NotificationStatus, PreferredLanguage } from "../enums";

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type: string;
  templateId: string;
  templateLocale: PreferredLanguage;
  subject: string | null;
  bodyPreview: string | null;
  status: NotificationStatus;
  externalMessageId: string | null;
  errorCode: string | null;
  retryCount: number;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  createdAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subjectTemplateEn: string | null;
  subjectTemplateAr: string | null;
  bodyTemplateEn: string;
  bodyTemplateAr: string;
  createdAt: Date;
  updatedAt: Date;
}
