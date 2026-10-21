/**
 * Teste de Carga Simulado com Deduplicação (Spec 008 / Definition of Done).
 * "nenhum e-mail duplicado em teste de carga simulado."
 */

import { enqueueNotification } from "./enqueue-notification";
import { processNotificationQueue } from "./process-notification-queue";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import type { EmailGateway } from "@/domain/interfaces/email-gateway";
import type {
  NotificationQueueItem,
  NotificationEventType,
} from "@/domain/types/notification";

describe("Simulação de Carga e Deduplicação (Spec 008 - Definition of Done)", () => {
  let memoryQueue: NotificationQueueItem[];
  let sentEmails: Array<{ to: string; subject: string; body: string }>;

  let inMemoryRepo: NotificationQueueRepository;
  let inMemoryGateway: EmailGateway;

  const STAKE_ID = "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3";

  beforeEach(() => {
    memoryQueue = [];
    sentEmails = [];

    inMemoryRepo = {
      async enqueue(input) {
        const item: NotificationQueueItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stakeId: input.stakeId,
          eventType: input.eventType,
          recipientId: input.recipientId,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          subject: input.subject,
          payload: input.payload,
          status: "pending",
          attempts: 0,
          maxAttempts: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        memoryQueue.push(item);
        return item;
      },

      async findRecentDuplicate(eventType, recipientEmail, reservationId, windowMinutes = 5) {
        const cutoff = Date.now() - windowMinutes * 60 * 1000;
        const found = memoryQueue.find((item) => {
          const matchEvent = item.eventType === eventType;
          const matchEmail = item.recipientEmail === recipientEmail;
          const matchRes = reservationId
            ? item.payload?.reservationId === reservationId
            : true;
          const itemTime = new Date(item.createdAt).getTime();
          return matchEvent && matchEmail && matchRes && itemTime >= cutoff;
        });
        return found ?? null;
      },

      async fetchPending(limit) {
        return memoryQueue
          .filter((i) => i.status === "pending")
          .slice(0, limit);
      },

      async updateStatus(id, status, options) {
        const idx = memoryQueue.findIndex((i) => i.id === id);
        if (idx !== -1) {
          memoryQueue[idx].status = status;
          if (options?.attempts !== undefined) memoryQueue[idx].attempts = options.attempts;
          if (options?.errorMessage !== undefined) memoryQueue[idx].errorMessage = options.errorMessage;
          if (options?.sentAt !== undefined) memoryQueue[idx].sentAt = options.sentAt;
        }
      },

      async getDailyMetrics() {
        return [];
      },
    };

    inMemoryGateway = {
      async send(input) {
        sentEmails.push({
          to: input.to,
          subject: input.subject,
          body: input.html,
        });
        return { messageId: `msg-${sentEmails.length}` };
      },
    };
  });

  it("sob rajada concorrente de 100 eventos repetidos na mesma reserva, enfileira exatamente 1 e-mail", async () => {
    const totalRequests = 100;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < totalRequests; i++) {
      promises.push(
        enqueueNotification(
          {
            stakeId: STAKE_ID,
            eventType: "RESERVATION_CONFIRMED_QR",
            recipientEmail: "membro.dedup@exemplo.com",
            recipientName: "Membro Concorrente",
            payload: { reservationId: "res-super-concorrente-999", seatNumber: 15 },
          },
          { repository: inMemoryRepo }
        )
      );
    }

    const results = await Promise.all(promises);

    // Exatamente uma requisição deve ter sido inserida de fato (deduplicated: false),
    // todas as outras 99 devem ter sido deduplicadas (deduplicated: true)
    const newEnqueued = results.filter((r) => !r.deduplicated);
    const deduplicated = results.filter((r) => r.deduplicated);

    expect(newEnqueued).toHaveLength(1);
    expect(deduplicated).toHaveLength(99);
    expect(memoryQueue).toHaveLength(1);

    // Processamento da fila
    const processResult = await processNotificationQueue(
      { batchSize: 50 },
      { repository: inMemoryRepo, emailGateway: inMemoryGateway }
    );

    expect(processResult.sent).toBe(1);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("membro.dedup@exemplo.com");
  });
});
