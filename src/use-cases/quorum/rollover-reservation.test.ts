/**
 * Testes unitários para RolloverReservationUseCase (Spec 006 - T006.3 / T006.4).
 * Artigo I: Domínio puro / TDD.
 * Artigo II: Isolamento multi-tenant absoluto (o rollover NUNCA altera ou migra o stake_id).
 */

import { RolloverReservationUseCase } from "./rollover-reservation";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { Caravan } from "@/domain/types/caravan";
import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";

describe("RolloverReservationUseCase (T006.3 e T006.4)", () => {
  let mockCaravanRepo: jest.Mocked<CaravanRepository>;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;
  let mockCreditRepo: jest.Mocked<CreditRepository>;
  let useCase: RolloverReservationUseCase;

  const originalCaravan: Caravan = {
    id: "caravan-cancelled",
    stake_id: "stake-natal",
    departure_date: "2026-11-20T05:00:00Z",
    return_date: "2026-11-21T22:00:00Z",
    price_standard: 130,
    price_officiant: 117,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-11-15T23:59:59Z",
    min_quorum: 48,
    quorum_check_date: "2026-11-17T00:00:00Z",
    status: "cancelled",
    caravan_leader_id: null,
    created_by: "admin-1",
    created_at: "2026-10-01T00:00:00Z",
  };

  const nextCaravan: Caravan = {
    id: "caravan-next",
    stake_id: "stake-natal",
    departure_date: "2026-12-18T05:00:00Z",
    return_date: "2026-12-19T22:00:00Z",
    price_standard: 130,
    price_officiant: 117,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-12-10T23:59:59Z",
    min_quorum: 48,
    quorum_check_date: "2026-12-12T00:00:00Z",
    status: "open",
    caravan_leader_id: null,
    created_by: "admin-1",
    created_at: "2026-10-01T00:00:00Z",
  };

  const originalReservation: Reservation = {
    id: "res-1",
    stake_id: "stake-natal",
    caravan_id: "caravan-cancelled",
    user_id: "user-1",
    ward_id: "ward-ponta-negra",
    seat_number: 12,
    boarding_point_id: "bp-1",
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "confirmado",
    payment_amount: 130,
    confirmed_at: "2026-10-05T10:00:00Z",
    confirmation_rank: 1,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-10-02T10:00:00Z",
  };

  beforeEach(() => {
    mockCaravanRepo = {
      findById: jest.fn(),
      findByStakeId: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      addBoardingPoint: jest.fn(),
      getBoardingPointsByCaravanId: jest.fn(),
      findPublicSummariesByStakeId: jest.fn(),
    };

    mockReservationRepo = {
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

    mockCreditRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      findExpiredActive: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new RolloverReservationUseCase(
      mockCaravanRepo,
      mockReservationRepo,
      mockCreditRepo
    );
  });

  it("deve realizar o rollover: gerar crédito 'caravan_cancelled' e recriar reserva na próxima caravana disponível", async () => {
    mockCaravanRepo.findById.mockResolvedValueOnce(originalCaravan);
    mockCaravanRepo.findByStakeId.mockResolvedValueOnce([originalCaravan, nextCaravan]);

    mockCreditRepo.create.mockResolvedValueOnce({
      id: "credit-1",
      stake_id: "stake-natal",
      ward_id: "ward-ponta-negra",
      user_id: "user-1",
      amount: 130,
      source: "caravan_cancelled",
      origin_reservation_id: "res-1",
      granted_by: null,
      reason: "Caravana cancelada por quórum mínimo",
      expires_at: "2027-11-20T05:00:00Z",
      used_at: null,
      status: "active",
      created_at: "2026-11-20T05:00:00Z",
    } as CreditLedgerEntry);

    mockReservationRepo.create.mockResolvedValueOnce({
      ...originalReservation,
      id: "res-next-1",
      caravan_id: "caravan-next",
      status: "confirmado",
    });

    const result = await useCase.execute({
      cancelledCaravanId: "caravan-cancelled",
      reservation: originalReservation,
    });

    expect(result.creditEntry.source).toBe("caravan_cancelled");
    expect(result.creditEntry.amount).toBe(130);
    expect(result.newReservation).toBeDefined();
    expect(result.newReservation?.caravan_id).toBe("caravan-next");
    expect(result.newReservation?.user_id).toBe("user-1");

    // Verifica que a reserva original foi marcada como cancelada_com_credito
    expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith("res-1", {
      status: "cancelada_com_credito",
    });
  });

  it("T006.4: Rollover NUNCA migra stake_id da reserva original", async () => {
    mockCaravanRepo.findById.mockResolvedValueOnce(originalCaravan);
    mockCaravanRepo.findByStakeId.mockResolvedValueOnce([originalCaravan, nextCaravan]);

    mockCreditRepo.create.mockImplementation(async (data) => {
      // Garante que o crédito herda exatamente o stake_id da reserva original
      expect(data.stake_id).toBe(originalReservation.stake_id);
      return {
        id: "credit-1",
        stake_id: data.stake_id!,
        ward_id: originalReservation.ward_id!,
        user_id: data.user_id,
        amount: data.amount,
        source: data.source,
        origin_reservation_id: data.origin_reservation_id ?? null,
        granted_by: null,
        reason: data.reason ?? null,
        expires_at: data.expires_at,
        used_at: null,
        status: "active",
        created_at: new Date().toISOString(),
      };
    });

    mockReservationRepo.create.mockImplementation(async (data) => {
      // Garante que a nova reserva NUNCA recebe ou migra para outro stake_id
      expect(data.stake_id).toBe(originalReservation.stake_id);
      expect(data.ward_id).toBe(originalReservation.ward_id);
      return {
        ...originalReservation,
        id: "res-new-stake-check",
        caravan_id: data.caravan_id,
        stake_id: data.stake_id!,
        ward_id: data.ward_id!,
      };
    });

    const result = await useCase.execute({
      cancelledCaravanId: "caravan-cancelled",
      reservation: originalReservation,
    });

    expect(result.creditEntry.stake_id).toBe("stake-natal");
    expect(result.newReservation?.stake_id).toBe("stake-natal");
    expect(result.newReservation?.ward_id).toBe("ward-ponta-negra");
  });

  it("deve gerar apenas crédito se não houver próxima caravana disponível na mesma Estaca", async () => {
    mockCaravanRepo.findById.mockResolvedValueOnce(originalCaravan);
    // Nenhuma outra caravana com status 'open' posterior
    mockCaravanRepo.findByStakeId.mockResolvedValueOnce([originalCaravan]);

    mockCreditRepo.create.mockResolvedValueOnce({
      id: "credit-2",
      stake_id: "stake-natal",
      ward_id: "ward-ponta-negra",
      user_id: "user-1",
      amount: 130,
      source: "caravan_cancelled",
      origin_reservation_id: "res-1",
      granted_by: null,
      reason: "Caravana cancelada por quórum mínimo",
      expires_at: "2027-11-20T05:00:00Z",
      used_at: null,
      status: "active",
      created_at: "2026-11-20T05:00:00Z",
    } as CreditLedgerEntry);

    const result = await useCase.execute({
      cancelledCaravanId: "caravan-cancelled",
      reservation: originalReservation,
    });

    expect(result.creditEntry.source).toBe("caravan_cancelled");
    expect(result.newReservation).toBeNull();
    expect(result.message).toContain("Nenhuma próxima caravana disponível");
  });
});
