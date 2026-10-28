/**
 * Tipos de domínio para Notificações por E-mail (Spec 008).
 * Artigo I da Constituição: camada domain/ pura, sem frameworks.
 */

export type NotificationEventType =
  | "RESERVATION_CONFIRMED_QR"
  | "PAYMENT_PENDING_ALERT"
  | "WAITLIST_PROMOTED"
  | "PAYMENT_CONFIRMED_WARD"
  | "RESERVATION_CANCELLED_OR_EXPIRED"
  | "CARAVAN_CANCELLED_QUORUM"
  | "CREDIT_EXPIRATION_ALERT"
  | "MINOR_APPROVAL_DECISION";

export type NotificationStatus = "pending" | "processing" | "sent" | "failed";

export interface NotificationQueueItem {
  id: string;
  stakeId: string;
  eventType: NotificationEventType;
  recipientId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  subject?: string | null;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  errorMessage?: string | null;
  priority?: number;
  scheduledFor?: string | null;
  leaseUntil?: string | null;
  dedupKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationMetric {
  sendDate: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}
