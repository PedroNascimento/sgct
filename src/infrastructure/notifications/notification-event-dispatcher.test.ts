import { NotificationEventDispatcher } from "./notification-event-dispatcher";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { PositionChangeEvent } from "@/domain/events/position-change";

describe("NotificationEventDispatcher (T008.7)", () => {
  let mockQueueRepo: jest.Mocked<NotificationQueueRepository>;
  let mockProfileRepo: jest.Mocked<ProfileRepository>;
  let dispatcher: NotificationEventDispatcher;

  const validUserId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const validStakeId = "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3";
  const validResId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

  const mockProfile = {
    id: validUserId,
    full_name: "Irmão Teste",
    cpf: "12345678900",
    birth_date: "1990-01-01",
    phone: "84999999999",
    sexo: "masculino" as const,
    ward_id: "7b4ac10b-58cc-4372-a567-0e02b2c3d479",
    stake_id: validStakeId,
    role: "member" as const,
    home_stake_name: null,
    home_ward_name: null,
    is_minor: false,
    guardian_id: null,
    is_active: true,
    last_login_at: null,
    created_at: "2026-10-21T00:00:00Z",
  };

  beforeEach(() => {
    mockQueueRepo = {
      enqueue: jest.fn().mockResolvedValue({
        id: "notif-1",
        stakeId: validStakeId,
        eventType: "RESERVATION_CONFIRMED_QR",
        recipientEmail: "membro@exemplo.com",
        payload: {},
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      findRecentDuplicate: jest.fn().mockResolvedValue(null),
      fetchPending: jest.fn(),
      updateStatus: jest.fn(),
      getDailyMetrics: jest.fn(),
    };

    mockProfileRepo = {
      findById: jest.fn().mockResolvedValue(mockProfile),
      findByCpf: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByStake: jest.fn(),
    };

    dispatcher = new NotificationEventDispatcher({
      queueRepository: mockQueueRepo,
      profileRepository: mockProfileRepo,
      findUserEmail: jest.fn().mockResolvedValue("membro@exemplo.com"),
    });
  });

  it("despacha notificação quando posição for confirmada (confirmed_within_capacity)", async () => {
    const event: PositionChangeEvent = {
      reservationId: validResId,
      userId: validUserId,
      caravanId: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      previousStatus: "lista_espera",
      newStatus: "confirmado",
      previousRank: 51,
      newRank: 48,
      reason: "confirmed_within_capacity",
      timestamp: "2026-10-21T10:00:00Z",
    };

    await dispatcher.dispatch(event);

    expect(mockQueueRepo.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "RESERVATION_CONFIRMED_QR",
        recipientEmail: "membro@exemplo.com",
        payload: expect.objectContaining({
          reservationId: validResId,
          newRank: 48,
        }),
      })
    );
  });

  it("despacha notificação de promoção de lista de espera", async () => {
    await dispatcher.notifyWaitlistPromoted({
      stakeId: validStakeId,
      recipientEmail: "membro@exemplo.com",
      recipientName: "Irmão Teste",
      assignedSeat: 14,
      reservationId: validResId,
    });

    expect(mockQueueRepo.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "WAITLIST_PROMOTED",
        recipientEmail: "membro@exemplo.com",
      })
    );
  });

  it("despacha notificação de decisão de menor de idade", async () => {
    await dispatcher.notifyMinorDecision({
      stakeId: validStakeId,
      recipientEmail: "responsavel@exemplo.com",
      recipientName: "Pai do Jovem",
      status: "approved",
      reservationId: validResId,
    });

    expect(mockQueueRepo.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "MINOR_APPROVAL_DECISION",
        recipientEmail: "responsavel@exemplo.com",
      })
    );
  });

  it("despacha notificação de cancelamento por quórum", async () => {
    await dispatcher.notifyCaravanCancelledQuorum({
      stakeId: validStakeId,
      recipientEmail: "membro@exemplo.com",
      recipientName: "Membro",
      caravanDepartureDate: "2026-11-20",
      reservationId: validResId,
    });

    expect(mockQueueRepo.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "CARAVAN_CANCELLED_QUORUM",
        recipientEmail: "membro@exemplo.com",
      })
    );
  });
});
