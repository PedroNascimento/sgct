/**
 * Testes para approveSeatSwap (T005.3 e T005.4).
 * Spec 005 / US-005.2
 *
 * Regras:
 * - T005.3: Líder de Caravana ou Admin Estaca aprova permuta, transferindo titularidade
 *   sem gerar entrada em credit_ledger.
 * - T005.4: Limite de 6 permutas no dia do embarque por caravana; a 7ª tentativa é rejeitada.
 * - Artigo II: Isolamento multi-tenant (apenas approver da mesma Estaca).
 * - Artigo IV: TDD obrigatório.
 */

import { approveSeatSwap } from "./approve-seat-swap";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { SwapRepository } from "@/domain/interfaces/swap-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Profile } from "@/domain/types/tenant";
import type { Caravan } from "@/domain/types/caravan";
import type { SeatSwapRequest } from "@/domain/types/swap";

const mockReservationRepository: jest.Mocked<ReservationRepository> = {
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
  findPendingExpired: jest.fn(),
};

const mockSwapRepository: jest.Mocked<SwapRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByReservationId: jest.fn(),
  countApprovedByCaravanAndDate: jest.fn(),
  updateStatus: jest.fn(),
};

const mockCaravanRepository: jest.Mocked<CaravanRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByStakeId: jest.fn(),
  updateStatus: jest.fn(),
  findUpcomingByStake: jest.fn(),
};

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

const mockCreditRepository: jest.Mocked<CreditRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findActiveByUserId: jest.fn(),
  findExpiredActive: jest.fn(),
  updateStatus: jest.fn(),
};

describe("approveSeatSwap (T005.3, T005.4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";
  const CARAVAN_ID = "22222222-2222-2222-2222-222222222222";
  const LEADER_ID = "33333333-3333-3333-3333-333333333333";
  const ADMIN_ESTACA_ID = "44444444-4444-4444-4444-444444444444";
  const REGULAR_MEMBER_ID = "55555555-5555-5555-5555-555555555555";
  const RESERVATION_ID = "66666666-6666-6666-6666-666666666666";
  const SWAP_ID = "77777777-7777-7777-7777-777777777777";

  const caravanLeaderProfile: Profile = {
    id: LEADER_ID,
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    role: "member",
    full_name: "Líder de Caravana",
    cpf: "111.111.111-11",
    birth_date: "1980-01-01",
    phone: "(84) 99999-9999",
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
  };

  const adminEstacaProfile: Profile = {
    id: ADMIN_ESTACA_ID,
    stake_id: STAKE_ID,
    ward_id: null,
    role: "admin_estaca",
    full_name: "Admin da Estaca",
    cpf: "222.222.222-22",
    birth_date: "1985-01-01",
    phone: "(84) 98888-8888",
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
  };

  const caravan: Caravan = {
    id: CARAVAN_ID,
    stake_id: STAKE_ID,
    name: "Caravana Recife Outubro",
    departure_date: "2026-10-25T06:00:00Z",
    return_date: "2026-10-26T20:00:00Z",
    total_seats: 50,
    status: "published",
    caravan_leader_id: LEADER_ID,
    created_at: "2026-08-01T00:00:00Z",
  };

  const confirmedReservation: Reservation = {
    id: RESERVATION_ID,
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: REGULAR_MEMBER_ID,
    ward_id: WARD_ID,
    seat_number: 10,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "confirmado",
    payment_amount: 130,
    confirmed_at: "2026-08-01T10:00:00Z",
    confirmation_rank: 1,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-08-01T09:00:00Z",
  };

  const pendingSwapRequest: SeatSwapRequest = {
    id: SWAP_ID,
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    original_reservation_id: RESERVATION_ID,
    new_holder_full_name: "Novo Passageiro Aprovado",
    new_holder_document: "333.333.333-33",
    requested_by: REGULAR_MEMBER_ID,
    status: "pending",
    created_at: "2026-08-10T10:00:00Z",
  };

  describe("T005.3 — Aprovação de permuta sem geração de crédito", () => {
    it("Líder da caravana aprova a permuta: atualiza titularidade e NÃO gera crédito no credit_ledger", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockProfileRepository.findById.mockResolvedValueOnce(caravanLeaderProfile);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(caravan);

      const approvedSwap: SeatSwapRequest = {
        ...pendingSwapRequest,
        status: "approved",
      };
      mockSwapRepository.updateStatus.mockResolvedValueOnce(approvedSwap);

      const result = await approveSeatSwap(
        {
          swapRequestId: SWAP_ID,
          approverId: LEADER_ID,
          currentDate: "2026-10-20", // Dias antes do embarque
        },
        {
          swapRepository: mockSwapRepository,
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          creditRepository: mockCreditRepository,
        }
      );

      expect(mockSwapRepository.updateStatus).toHaveBeenCalledWith(SWAP_ID, "approved");
      expect(mockReservationRepository.addManifestEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          reservation_id: RESERVATION_ID,
          full_name: "Novo Passageiro Aprovado",
        })
      );
      // NUNCA deve gerar crédito (US-005.2)
      expect(mockCreditRepository.create).not.toHaveBeenCalled();

      expect(result.swapRequest.status).toBe("approved");
      expect(result.reservation.id).toBe(RESERVATION_ID);
    });

    it("Admin Estaca aprova permuta com sucesso", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaProfile);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(caravan);

      mockSwapRepository.updateStatus.mockResolvedValueOnce({
        ...pendingSwapRequest,
        status: "approved",
      });

      const result = await approveSeatSwap(
        {
          swapRequestId: SWAP_ID,
          approverId: ADMIN_ESTACA_ID,
          currentDate: "2026-10-20",
        },
        {
          swapRepository: mockSwapRepository,
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          creditRepository: mockCreditRepository,
        }
      );

      expect(result.swapRequest.status).toBe("approved");
    });

    it("rejeita se o aprovador for um membro comum que não é Líder da Caravana", async () => {
      const regularProfile: Profile = {
        ...caravanLeaderProfile,
        id: REGULAR_MEMBER_ID,
        role: "member",
      };

      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockProfileRepository.findById.mockResolvedValueOnce(regularProfile);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(caravan);

      await expect(
        approveSeatSwap(
          {
            swapRequestId: SWAP_ID,
            approverId: REGULAR_MEMBER_ID,
          },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
            creditRepository: mockCreditRepository,
          }
        )
      ).rejects.toThrow("Apenas o Líder da Caravana ou Admin da Estaca podem aprovar permutas.");
    });
  });

  describe("T005.4 — Limite de 6 permutas no dia do embarque", () => {
    it("permite a 6ª permuta no dia do embarque", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockProfileRepository.findById.mockResolvedValueOnce(caravanLeaderProfile);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(caravan);
      // Já existem 5 aprovadas no dia do embarque -> 6ª é permitida
      mockSwapRepository.countApprovedByCaravanAndDate.mockResolvedValueOnce(5);

      mockSwapRepository.updateStatus.mockResolvedValueOnce({
        ...pendingSwapRequest,
        status: "approved",
      });

      const result = await approveSeatSwap(
        {
          swapRequestId: SWAP_ID,
          approverId: LEADER_ID,
          currentDate: "2026-10-25", // Dia do embarque
        },
        {
          swapRepository: mockSwapRepository,
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          creditRepository: mockCreditRepository,
        }
      );

      expect(result.swapRequest.status).toBe("approved");
    });

    it("rejeita a 7ª tentativa de permuta no dia do embarque", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockProfileRepository.findById.mockResolvedValueOnce(caravanLeaderProfile);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(caravan);
      // Já existem 6 aprovadas no dia do embarque -> a 7ª deve ser rejeitada
      mockSwapRepository.countApprovedByCaravanAndDate.mockResolvedValueOnce(6);

      await expect(
        approveSeatSwap(
          {
            swapRequestId: SWAP_ID,
            approverId: LEADER_ID,
            currentDate: "2026-10-25", // Dia do embarque
          },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
            creditRepository: mockCreditRepository,
          }
        )
      ).rejects.toThrow("Limite de 6 permutas no dia do embarque atingido para esta caravana.");
    });
  });

  describe("Validações e Casos Limítrofes", () => {
    it("rejeita se a solicitação de permuta não for encontrada", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(null);

      await expect(
        approveSeatSwap(
          { swapRequestId: SWAP_ID, approverId: LEADER_ID },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
          }
        )
      ).rejects.toThrow("Solicitação de permuta não encontrada.");
    });

    it("rejeita se a permuta já tiver sido aprovada ou rejeitada", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce({
        ...pendingSwapRequest,
        status: "approved",
      });

      await expect(
        approveSeatSwap(
          { swapRequestId: SWAP_ID, approverId: LEADER_ID },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
          }
        )
      ).rejects.toThrow("Esta solicitação de permuta já está 'approved'.");
    });

    it("rejeita se a reserva original não for encontrada", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockReservationRepository.findById.mockResolvedValueOnce(null);

      await expect(
        approveSeatSwap(
          { swapRequestId: SWAP_ID, approverId: LEADER_ID },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
          }
        )
      ).rejects.toThrow("Reserva original não encontrada.");
    });

    it("rejeita se a caravana não for encontrada", async () => {
      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(null);

      await expect(
        approveSeatSwap(
          { swapRequestId: SWAP_ID, approverId: LEADER_ID },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
          }
        )
      ).rejects.toThrow("Caravana não encontrada.");
    });

    it("rejeita se o aprovador for de outra Estaca (Artigo II)", async () => {
      const crossStakeLeader: Profile = {
        ...caravanLeaderProfile,
        stake_id: "99999999-9999-9999-9999-999999999999",
      };

      mockSwapRepository.findById.mockResolvedValueOnce(pendingSwapRequest);
      mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
      mockCaravanRepository.findById.mockResolvedValueOnce(caravan);
      mockProfileRepository.findById.mockResolvedValueOnce(crossStakeLeader);

      await expect(
        approveSeatSwap(
          { swapRequestId: SWAP_ID, approverId: LEADER_ID },
          {
            swapRepository: mockSwapRepository,
            reservationRepository: mockReservationRepository,
            caravanRepository: mockCaravanRepository,
            profileRepository: mockProfileRepository,
          }
        )
      ).rejects.toThrow("Não autorizado: reserva pertence a outra Estaca.");
    });
  });
});
