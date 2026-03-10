import { TicketCategory, TicketPriority, TicketStatus } from '../enums';

export interface SupportTicket {
  id: string;
  userId: string;
  orderId?: string;
  ticketNumber: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  assignedTo?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  isStaffReply: boolean;
  body: string;
  createdAt: Date;
}

export interface TicketAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}
