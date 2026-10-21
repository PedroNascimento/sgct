import {
  enqueueNotification,
  EnqueueNotificationUseCaseInput,
} from "./enqueue-notification";
import type {
  NotificationQueueRepository,
  EnqueueNotificationInput,
} from "@/domain/interfaces/notification-queue-repository";
import type { NotificationQueueItem } from "@/domain/types/notification";

describe("enqueueNotification (T008.2 / T008.6)", () => {
  let mockRepo: jest.Mocked<NotificationQueueRepository>;

  const defaultItem: NotificationQueueItem = {
    id: "notif-uuid-1",
    stakeId: "stake-uuid-1",
    eventType: "RESERVATION_CONFIRMED_QR",
    recipientId: "user-uuid-1",
    recipientEmail: "membro@exemplo.com",
    recipientName: "Irmão Silva",
    subject: "Sua reserva foi confirmada!",
    payload: { reservationId: "res-uuid-1", seatNumber: 12 },
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
      enqueue: jest.fn().mockResolvedValue(defaultItem),
      findRecentDuplicate: jest.fn().mockResolvedValue(null),
      fetchPending: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      getDailyMetrics: jest.fn().mockResolvedValue([]),
    };
  });

  it("enfileira com sucesso uma notificação válida", async () => {
    const input: EnqueueNotificationUseCaseInput = {
      stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
      eventType: "RESERVATION_CONFIRMED_QR",
      recipientId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      recipientEmail: "membro@exemplo.com",
      recipientName: "Irmão Silva",
      subject: "Sua reserva foi confirmada!",
      payload: { reservationId: "res-uuid-1", seatNumber: 12 },
    };

    const result = await enqueueNotification(input, { repository: mockRepo });

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(false);
    expect(mockRepo.enqueue).toHaveBeenCalledTimes(1);
    expect(mockRepo.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        stakeId: input.stakeId,
        eventType: "RESERVATION_CONFIRMED_QR",
        recipientEmail: "membro@exemplo.com",
      })
    );
  });

  it("não duplica notificação para mesmo evento + mesma reserva em janela de 5 min (T008.6 / US-008.1)", async () => {
    mockRepo.findRecentDuplicate.mockResolvedValueOnce(defaultItem);

    const input: EnqueueNotificationUseCaseInput = {
      stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
      eventType: "RESERVATION_CONFIRMED_QR",
      recipientEmail: "membro@exemplo.com",
      payload: { reservationId: "res-uuid-1" },
    };

    const result = await enqueueNotification(input, { repository: mockRepo });

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
    expect(result.notificationId).toBe(defaultItem.id);
    expect(mockRepo.findRecentDuplicate).toHaveBeenCalledWith(
      "RESERVATION_CONFIRMED_QR",
      "membro@exemplo.com",
      "res-uuid-1",
      5
    );
    expect(mockRepo.enqueue).not.toHaveBeenCalled();
  });

  it("rejeita entrada com email inválido", async () => {
    const input = {
      stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
      eventType: "RESERVATION_CONFIRMED_QR" as const,
      recipientEmail: "email-invalido",
      payload: {},
    };

    await expect(
      enqueueNotification(input, { repository: mockRepo })
    ).rejects.toThrow();
    expect(mockRepo.enqueue).not.toHaveBeenCalled();
  });

  it("rejeita entrada sem stakeId", async () => {
    const input = {
      stakeId: "",
      eventType: "RESERVATION_CONFIRMED_QR" as const,
      recipientEmail: "membro@exemplo.com",
      payload: {},
    };

    await expect(
      enqueueNotification(input, { repository: mockRepo })
    ).rejects.toThrow();
  });
});
