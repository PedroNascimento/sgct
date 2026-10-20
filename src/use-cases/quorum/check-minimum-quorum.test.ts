/**
 * Teste unitário para CheckMinimumQuorumUseCase (Spec 006 - T006.1).
 * Artigo IV: TDD red-green-refactor.
 * Validação dos casos de limite estrito: 47 (cancela), 48 (mantém), 49 (mantém).
 */

import { CheckMinimumQuorumUseCase } from "./check-minimum-quorum";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { Caravan } from "@/domain/types/caravan";
import type { Reservation } from "@/domain/types/reservation";

describe("CheckMinimumQuorumUseCase (T006.1)", () => {
  let mockCaravanRepo: jest.Mocked<CaravanRepository>;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;
  let useCase: CheckMinimumQuorumUseCase;

  const baseCaravan: Caravan = {
    id: "caravan-1",
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
    status: "open",
    caravan_leader_id: null,
    created_by: "admin-1",
    created_at: "2026-10-01T00:00:00Z",
  };

  const createDummyReservation = (id: string, status: "confirmado" | "pago_ala"): Reservation => ({
    id,
    stake_id: "stake-natal",
    caravan_id: "caravan-1",
    user_id: `user-${id}`,
    ward_id: "ward-1",
    seat_number: 1,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status,
    payment_amount: 130,
    confirmed_at: "2026-10-10T10:00:00Z",
    confirmation_rank: 1,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-10-01T00:00:00Z",
  });

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

    useCase = new CheckMinimumQuorumUseCase(mockCaravanRepo, mockReservationRepo);
  });

  it("deve cancelar a caravana se o total de confirmado + pago_ala for 47 (< 48)", async () => {
    mockCaravanRepo.findById.mockResolvedValue(baseCaravan);
    
    // 40 confirmados + 7 pago_ala = 47
    const reservations: Reservation[] = [
      ...Array.from({ length: 40 }, (_, i) => createDummyReservation(`c-${i}`, "confirmado")),
      ...Array.from({ length: 7 }, (_, i) => createDummyReservation(`p-${i}`, "pago_ala")),
    ];
    mockReservationRepo.findByCaravanAndStatuses.mockResolvedValue(reservations);
    mockCaravanRepo.updateStatus.mockResolvedValue({ ...baseCaravan, status: "cancelled" });

    const result = await useCase.execute({ caravanId: "caravan-1" });

    expect(result.cancelled).toBe(true);
    expect(result.totalEligible).toBe(47);
    expect(result.minQuorum).toBe(48);
    expect(mockCaravanRepo.updateStatus).toHaveBeenCalledWith("caravan-1", "cancelled");
  });

  it("NÃO deve cancelar a caravana se o total de confirmado + pago_ala for exatamente 48 (limite exato)", async () => {
    mockCaravanRepo.findById.mockResolvedValue(baseCaravan);

    // 48 confirmados
    const reservations: Reservation[] = Array.from({ length: 48 }, (_, i) =>
      createDummyReservation(`c-${i}`, "confirmado")
    );
    mockReservationRepo.findByCaravanAndStatuses.mockResolvedValue(reservations);

    const result = await useCase.execute({ caravanId: "caravan-1" });

    expect(result.cancelled).toBe(false);
    expect(result.totalEligible).toBe(48);
    expect(result.minQuorum).toBe(48);
    expect(mockCaravanRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("NÃO deve cancelar a caravana se o total for 49 (> 48)", async () => {
    mockCaravanRepo.findById.mockResolvedValue(baseCaravan);

    // 45 confirmados + 4 pago_ala = 49
    const reservations: Reservation[] = [
      ...Array.from({ length: 45 }, (_, i) => createDummyReservation(`c-${i}`, "confirmado")),
      ...Array.from({ length: 4 }, (_, i) => createDummyReservation(`p-${i}`, "pago_ala")),
    ];
    mockReservationRepo.findByCaravanAndStatuses.mockResolvedValue(reservations);

    const result = await useCase.execute({ caravanId: "caravan-1" });

    expect(result.cancelled).toBe(false);
    expect(result.totalEligible).toBe(49);
    expect(result.minQuorum).toBe(48);
    expect(mockCaravanRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("deve lançar erro se a caravana não for encontrada", async () => {
    mockCaravanRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ caravanId: "nao-existe" })).rejects.toThrow(
      "Caravana não encontrada"
    );
  });

  it("não deve alterar caravanas que já estão canceladas ou completadas", async () => {
    mockCaravanRepo.findById.mockResolvedValue({ ...baseCaravan, status: "cancelled" });

    const result = await useCase.execute({ caravanId: "caravan-1" });

    expect(result.cancelled).toBe(true);
    expect(mockCaravanRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockReservationRepo.findByCaravanAndStatuses).not.toHaveBeenCalled();
  });
});
