import { TicketCategory, TicketPriority, TicketStatus } from "../enums";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  orderId: string | null;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  slaFirstResponseDeadline: Date | null;
  slaResolutionDeadline: Date | null;
  csatRating: number | null;
  csatComment: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  messageId: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}
