import { approveAid, rejectAid } from "./process-aid";
import type { AidRepository } from "@/domain/interfaces/aid-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";

describe("Use-cases: approveAid e rejectAid (Spec 012 / T012.4 / T012.5 / T012.9)", () => {
  const mockAidRepo: jest.Mocked<AidRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByReservationId: jest.fn(),
    findPendingByWard: jest.fn(),
    findPendingByStake: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockReservationRepo: jest.Mocked<ReservationRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByCaravanId: jest.fn(),
    findByCaravanAndStatuses: jest.fn(),
    getSeatOccupancy: jest.fn(),
    addManifestEntry: jest.fn(),
    getManifestEntriesByReservationId: jest.fn(),
    updateStatus: jest.fn(),
    updateBatch: jest.fn(),
    countWaitlistAhead: jest.fn(),
    findPendingExpired: jest.fn(),
  };

  const mockProfileRepo: jest.Mocked<ProfileRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockQueueRepo: jest.Mocked<NotificationQueueRepository> = {
    enqueue: jest.fn().mockResolvedValue({
      id: "queue-1",
      stake_id: "stake-1",
      event_type: "PAYMENT_CONFIRMED_WARD",
      recipient_id: "member-1",
      recipient_email: "membro@teste.org",
      recipient_name: "Membro Custeado",
      payload: {},
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      next_retry_at: null,
      sent_at: null,
      failed_at: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    findPending: jest.fn(),
    findRecentDuplicate: jest.fn().mockResolvedValue(null),
    markSent: jest.fn(),
    markFailed: jest.fn(),
  };

  const stakeId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const wardId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const memberId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const approverId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

  const baseAidRequest = {
    id: "aid-1",
    stake_id: stakeId,
    ward_id: wardId,
    reservation_id: "res-1",
    aid_type: "auxilio_recem_converso" as const,
    status: "pending" as const,
    requested_by: "admin-1",
    approved_by: null,
    requested_at: new Date().toISOString(),
    approved_at: null,
    notes: null,
  };

  const baseReservation = {
    id: "res-1",
    stake_id: stakeId,
    ward_id: wardId,
    caravan_id: "caravan-1",
    user_id: memberId,
    seat_number: 5,
    category: "standard" as const,
    participant_type: "adulto" as const,
    funding_source: "auxilio_recem_converso" as const,
    is_preferential_seating: false,
    status: "aguardando_auxilio" as const,
    payment_amount: 130,
    created_at: new Date().toISOString(),
  };

  const approverAdmin = {
    id: approverId,
    stake_id: stakeId,
    ward_id: wardId,
    full_name: "Líder de Caravana",
    role: "admin_ala" as const,
    is_active: true,
    cpf: "11122233344",
    birth_date: "1985-05-05",
    sexo: "masculino" as const,
    phone: "84999999999",
    home_stake_name: null,
    home_ward_name: null,
    is_minor: false,
    guardian_id: null,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  const memberProfile = {
    id: memberId,
    stake_id: stakeId,
    ward_id: wardId,
    full_name: "Membro Custeado",
    role: "member" as const,
    is_active: true,
    cpf: "22233344455",
    birth_date: "1995-05-05",
    sexo: "masculino" as const,
    phone: "84988888888",
    home_stake_name: null,
    home_ward_name: null,
    is_minor: false,
    guardian_id: null,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("approveAid", () => {
    it("aprova auxílio e transiciona reserva para pago_ala com notificação (US-012.2)", async () => {
      mockAidRepo.findById.mockResolvedValueOnce(baseAidRequest);
      mockReservationRepo.findById.mockResolvedValueOnce(baseReservation);
      mockProfileRepo.findById
        .mockResolvedValueOnce(approverAdmin)
        .mockResolvedValueOnce(memberProfile);

      mockAidRepo.updateStatus.mockResolvedValueOnce({
        ...baseAidRequest,
        status: "approved",
        approved_by: "approver-1",
        approved_at: new Date().toISOString(),
      });

      mockReservationRepo.updateStatus.mockResolvedValueOnce({
        ...baseReservation,
        status: "pago_ala",
      });

      const result = await approveAid(
        { aidRequestId: "aid-1", approverId: "approver-1", notes: "Aprovado em conselho" },
        {
          aidRepository: mockAidRepo,
          reservationRepository: mockReservationRepo,
          profileRepository: mockProfileRepo,
          notificationQueueRepository: mockQueueRepo,
          findUserEmail: jest.fn().mockResolvedValue("membro@teste.org"),
        }
      );

      expect(result.aidRequest.status).toBe("approved");
      expect(result.reservation.status).toBe("pago_ala");
      expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith("res-1", { status: "pago_ala" });
      expect(mockQueueRepo.enqueue).toHaveBeenCalledTimes(1);
    });

    it("bloqueia aprovação se usuário for de outra Ala (Artigo II)", async () => {
      const crossAdmin = {
        ...approverAdmin,
        ward_id: "ward-other",
      };

      mockAidRepo.findById.mockResolvedValueOnce(baseAidRequest);
      mockReservationRepo.findById.mockResolvedValueOnce(baseReservation);
      mockProfileRepo.findById.mockResolvedValueOnce(crossAdmin);

      await expect(
        approveAid(
          { aidRequestId: "aid-1", approverId: "cross-admin" },
          {
            aidRepository: mockAidRepo,
            reservationRepository: mockReservationRepo,
            profileRepository: mockProfileRepo,
            notificationQueueRepository: mockQueueRepo,
          }
        )
      ).rejects.toThrow("Não autorizado: pedido pertence a outra Ala.");
    });
  });

  describe("rejectAid", () => {
    it("reprova auxílio e transiciona reserva para cancelada_sem_credito (US-012.2)", async () => {
      mockAidRepo.findById.mockResolvedValueOnce(baseAidRequest);
      mockReservationRepo.findById.mockResolvedValueOnce(baseReservation);
      mockProfileRepo.findById
        .mockResolvedValueOnce(approverAdmin)
        .mockResolvedValueOnce(memberProfile);

      mockAidRepo.updateStatus.mockResolvedValueOnce({
        ...baseAidRequest,
        status: "rejected",
        approved_by: "approver-1",
        approved_at: new Date().toISOString(),
        notes: "Sem saldo no fundo",
      });

      mockReservationRepo.updateStatus.mockResolvedValueOnce({
        ...baseReservation,
        status: "cancelada_sem_credito",
      });

      const result = await rejectAid(
        { aidRequestId: "aid-1", rejecterId: "approver-1", reason: "Sem saldo no fundo" },
        {
          aidRepository: mockAidRepo,
          reservationRepository: mockReservationRepo,
          profileRepository: mockProfileRepo,
          notificationQueueRepository: mockQueueRepo,
          findUserEmail: jest.fn().mockResolvedValue("membro@teste.org"),
        }
      );

      expect(result.aidRequest.status).toBe("rejected");
      expect(result.reservation.status).toBe("cancelada_sem_credito");
      expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith("res-1", { status: "cancelada_sem_credito" });
      expect(mockQueueRepo.enqueue).toHaveBeenCalledTimes(1);
    });
  });
});
