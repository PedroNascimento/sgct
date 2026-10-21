/**
 * Interface do repositório da fila de notificações (Spec 008).
 * Artigo I: camada domain/ desacoplada de infraestrutura.
 */

import type {
  NotificationEventType,
  NotificationQueueItem,
  NotificationMetric,
} from "@/domain/types/notification";

export interface EnqueueNotificationInput {
  stakeId: string;
  eventType: NotificationEventType;
  recipientId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  subject?: string | null;
  payload: Record<string, unknown>;
}

export interface NotificationQueueRepository {
  enqueue(item: EnqueueNotificationInput): Promise<NotificationQueueItem>;
  findRecentDuplicate(
    eventType: NotificationEventType,
    recipientEmail: string,
    reservationId?: string,
    windowMinutes?: number
  ): Promise<NotificationQueueItem | null>;
  fetchPending(limit: number): Promise<NotificationQueueItem[]>;
  updateStatus(
    id: string,
    status: NotificationQueueItem["status"],
    options?: {
      errorMessage?: string | null;
      attempts?: number;
      sentAt?: string | null;
      lastAttemptAt?: string | null;
    }
  ): Promise<void>;
  getDailyMetrics(stakeId: string): Promise<NotificationMetric[]>;
}
