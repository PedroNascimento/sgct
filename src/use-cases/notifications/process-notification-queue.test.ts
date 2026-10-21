import { processNotificationQueue } from "./process-notification-queue";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import type { EmailGateway } from "@/domain/interfaces/email-gateway";
import type { NotificationQueueItem } from "@/domain/types/notification";

describe("processNotificationQueue (T008.5)", () => {
  let mockRepo: jest.Mocked<NotificationQueueRepository>;
  let mockGateway: jest.Mocked<EmailGateway>;

  const pendingItem: NotificationQueueItem = {
    id: "notif-1",
    stakeId: "stake-uuid-1",
    eventType: "RESERVATION_CONFIRMED_QR",
    recipientEmail: "membro@exemplo.com",
    recipientName: "Pedro Silva",
    payload: { seatNumber: 10, caravanDepartureDate: "2026-11-20" },
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    lastAttemptAt: null,
    sentAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockRepo = {
      enqueue: jest.fn(),
      findRecentDuplicate: jest.fn(),
      fetchPending: jest.fn().mockResolvedValue([pendingItem]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      getDailyMetrics: jest.fn(),
    };

    mockGateway = {
      send: jest.fn().mockResolvedValue({ messageId: "msg-123" }),
    };
  });

  it("processa fila com sucesso e atualiza status para 'sent'", async () => {
    const result = await processNotificationQueue(
      { batchSize: 10 },
      { repository: mockRepo, emailGateway: mockGateway }
    );

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockGateway.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "membro@exemplo.com",
        subject: expect.stringContaining("Confirmada"),
      })
    );
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      "notif-1",
      "sent",
      expect.objectContaining({
        attempts: 1,
      })
    );
  });

  it("em caso de falha de envio com tentativas < 3, mantém 'pending' para retry exponencial", async () => {
    mockGateway.send.mockRejectedValueOnce(new Error("Timeout Resend API"));

    const itemFirstAttempt: NotificationQueueItem = {
      ...pendingItem,
      attempts: 0,
    };
    mockRepo.fetchPending.mockResolvedValueOnce([itemFirstAttempt]);

    const result = await processNotificationQueue(
      { batchSize: 10 },
      { repository: mockRepo, emailGateway: mockGateway }
    );

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      "notif-1",
      "pending",
      expect.objectContaining({
        attempts: 1,
        errorMessage: expect.stringContaining("Timeout Resend API"),
      })
    );
  });

  it("em caso de 3ª falha consecutiva, marca como 'failed' definitivo", async () => {
    mockGateway.send.mockRejectedValueOnce(new Error("Destinatário bloqueado"));

    const itemLastAttempt: NotificationQueueItem = {
      ...pendingItem,
      attempts: 2, // já falhou 2 vezes, esta é a 3ª
      maxAttempts: 3,
    };
    mockRepo.fetchPending.mockResolvedValueOnce([itemLastAttempt]);

    const result = await processNotificationQueue(
      { batchSize: 10 },
      { repository: mockRepo, emailGateway: mockGateway }
    );

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      "notif-1",
      "failed",
      expect.objectContaining({
        attempts: 3,
        errorMessage: expect.stringContaining("Destinatário bloqueado"),
      })
    );
  });

  it("respeita o batchSize especificado", async () => {
    await processNotificationQueue(
      { batchSize: 5 },
      { repository: mockRepo, emailGateway: mockGateway }
    );

    expect(mockRepo.fetchPending).toHaveBeenCalledWith(5);
  });
});
