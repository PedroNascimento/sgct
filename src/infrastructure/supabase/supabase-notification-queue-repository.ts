/**
 * Implementação Supabase do repositório de fila de notificações (Spec 008).
 * Artigo I: infraestrutura que implementa NotificationQueueRepository.
 * Artigo V: operado exclusivamente com service_role via backend confiável.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NotificationQueueRepository,
  EnqueueNotificationInput,
} from "@/domain/interfaces/notification-queue-repository";
import type {
  NotificationQueueItem,
  NotificationMetric,
} from "@/domain/types/notification";

interface NotificationQueueRow {
  id: string;
  stake_id: string;
  event_type: string;
  recipient_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToItem(row: NotificationQueueRow): NotificationQueueItem {
  return {
    id: row.id,
    stakeId: row.stake_id,
    eventType: row.event_type as NotificationQueueItem["eventType"],
    recipientId: row.recipient_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    payload: row.payload ?? {},
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastAttemptAt: row.last_attempt_at,
    sentAt: row.sent_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseNotificationQueueRepository
  implements NotificationQueueRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueue(
    item: EnqueueNotificationInput
  ): Promise<NotificationQueueItem> {
    const { data, error } = await this.supabase
      .from("notification_queue")
      .insert({
        stake_id: item.stakeId,
        event_type: item.eventType,
        recipient_id: item.recipientId ?? null,
        recipient_email: item.recipientEmail,
        recipient_name: item.recipientName ?? null,
        subject: item.subject ?? null,
        payload: item.payload,
        status: "pending",
        attempts: 0,
        max_attempts: 3,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao enfileirar notificação: ${error.message}`);
    }

    return mapRowToItem(data as NotificationQueueRow);
  }

  async findRecentDuplicate(
    eventType: NotificationQueueItem["eventType"],
    recipientEmail: string,
    reservationId?: string,
    windowMinutes = 5
  ): Promise<NotificationQueueItem | null> {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    let query = this.supabase
      .from("notification_queue")
      .select("*")
      .eq("event_type", eventType)
      .eq("recipient_email", recipientEmail)
      .gte("created_at", cutoff);

    if (reservationId) {
      query = query.eq("payload->>reservationId", reservationId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.warn("Erro ao buscar duplicata de notificação:", error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapRowToItem(data[0] as NotificationQueueRow);
  }

  async fetchPending(limit: number): Promise<NotificationQueueItem[]> {
    const { data, error } = await this.supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar notificações pendentes: ${error.message}`);
    }

    return (data || []).map((row) => mapRowToItem(row as NotificationQueueRow));
  }

  async updateStatus(
    id: string,
    status: NotificationQueueItem["status"],
    options?: {
      errorMessage?: string | null;
      attempts?: number;
      sentAt?: string | null;
      lastAttemptAt?: string | null;
    }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (options?.errorMessage !== undefined) {
      updates.error_message = options.errorMessage;
    }
    if (options?.attempts !== undefined) {
      updates.attempts = options.attempts;
    }
    if (options?.sentAt !== undefined) {
      updates.sent_at = options.sentAt;
    }
    if (options?.lastAttemptAt !== undefined) {
      updates.last_attempt_at = options.lastAttemptAt;
    }

    const { error } = await this.supabase
      .from("notification_queue")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw new Error(
        `Erro ao atualizar status da notificação ${id}: ${error.message}`
      );
    }
  }

  async getDailyMetrics(stakeId: string): Promise<NotificationMetric[]> {
    const { data, error } = await this.supabase.rpc(
      "get_notification_metrics",
      { p_stake_id: stakeId }
    );

    if (error) {
      // Fallback gracioso caso a RPC não esteja instalada no ambiente de mock
      console.warn("Erro ao chamar get_notification_metrics:", error.message);
      return [];
    }

    return ((data || []) as Array<{
      send_date: string;
      total_count: number;
      sent_count: number;
      failed_count: number;
      pending_count: number;
    }>).map((row) => ({
      sendDate: row.send_date,
      totalCount: Number(row.total_count),
      sentCount: Number(row.sent_count),
      failedCount: Number(row.failed_count),
      pendingCount: Number(row.pending_count),
    }));
  }
}
