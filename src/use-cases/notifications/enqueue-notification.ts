/**
 * Use-case: Enfileirar notificação por e-mail com deduplicação (Spec 008 / T008.2 / T008.6).
 * Artigo I: regra de negócio pura em use-cases/.
 * Artigo V: validação estrita com Zod.
 */

import { z } from "zod";
import type {
  NotificationEventType,
  NotificationQueueItem,
} from "@/domain/types/notification";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";

const NotificationEventTypeSchema = z.enum([
  "RESERVATION_CONFIRMED_QR",
  "PAYMENT_PENDING_ALERT",
  "WAITLIST_PROMOTED",
  "PAYMENT_CONFIRMED_WARD",
  "RESERVATION_CANCELLED_OR_EXPIRED",
  "CARAVAN_CANCELLED_QUORUM",
  "CREDIT_EXPIRATION_ALERT",
  "MINOR_APPROVAL_DECISION",
]);

export const EnqueueNotificationSchema = z.object({
  stakeId: z.string().uuid("stakeId deve ser um UUID válido"),
  eventType: NotificationEventTypeSchema,
  recipientId: z.string().uuid().nullable().optional(),
  recipientEmail: z.string().email("recipientEmail deve ser um e-mail válido"),
  recipientName: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  payload: z.record(z.unknown()).default({}),
});

export type EnqueueNotificationUseCaseInput = z.infer<
  typeof EnqueueNotificationSchema
>;

export interface EnqueueNotificationResult {
  success: boolean;
  deduplicated: boolean;
  notificationId: string;
}

export interface EnqueueNotificationDependencies {
  repository: NotificationQueueRepository;
}

// Mapa de promessas em vôo para serialização atômica contra rajadas concorrentes
const inFlightRequests = new Map<string, Promise<EnqueueNotificationResult>>();

export async function enqueueNotification(
  input: EnqueueNotificationUseCaseInput,
  deps: EnqueueNotificationDependencies
): Promise<EnqueueNotificationResult> {
  const validated = EnqueueNotificationSchema.parse(input);

  const reservationId =
    typeof validated.payload?.reservationId === "string"
      ? (validated.payload.reservationId as string)
      : undefined;

  const dedupKey = `${validated.stakeId}:${validated.eventType}:${validated.recipientEmail}:${reservationId ?? "no-res"}`;

  // Se já há uma requisição em andamento para a mesma chave concorrentemente
  const existingInFlight = inFlightRequests.get(dedupKey);
  if (existingInFlight) {
    const original = await existingInFlight;
    return {
      success: true,
      deduplicated: true,
      notificationId: original.notificationId,
    };
  }

  // Cria a Promise e armazena no mapa de concorrência
  const executionPromise = (async (): Promise<EnqueueNotificationResult> => {
    // Deduplicação: se já existe o mesmo evento para a mesma reserva/destinatário em 5 min no repositório
    const duplicate = await deps.repository.findRecentDuplicate(
      validated.eventType,
      validated.recipientEmail,
      reservationId,
      5
    );

    if (duplicate) {
      return {
        success: true,
        deduplicated: true,
        notificationId: duplicate.id,
      };
    }

    const enqueued = await deps.repository.enqueue({
      stakeId: validated.stakeId,
      eventType: validated.eventType,
      recipientId: validated.recipientId ?? null,
      recipientEmail: validated.recipientEmail,
      recipientName: validated.recipientName ?? null,
      subject: validated.subject ?? null,
      payload: validated.payload,
    });

    return {
      success: true,
      deduplicated: false,
      notificationId: enqueued.id,
    };
  })();

  inFlightRequests.set(dedupKey, executionPromise);

  try {
    return await executionPromise;
  } finally {
    inFlightRequests.delete(dedupKey);
  }
}
