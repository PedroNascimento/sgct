/**
 * Testes para recalculateCaravanRanking (T004.3)
 *
 * Regras:
 * - Reordena reservas confirmadas/lista de espera por confirmed_at (US-004.3 / D17).
 * - Limite de 50 assentos: primeiros 50 recebem 'confirmado' com rank 1..50; excedente vai para 'lista_espera' com rank 51.. (US-004.3).
 * - Casos limites: 48, 49, 50 e 51 reservas.
 * - Convidado inter-estaca (D28): rankeado SEMPRE depois dos membros da estaca anfitriã.
 * - Gera eventos de mudança de posição (T004.9).
 */

import { recalculateCaravanRanking } from "./recalculate-caravan-ranking";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Caravan } from "@/domain/types/caravan";

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

const mockCaravanRepository: jest.Mocked<CaravanRepository> = {
  findById: jest.fn(),
  findByStakeId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  addBoardingPoint: jest.fn(),
  getBoardingPointsByCaravanId: jest.fn(),
  findPublicSummariesByStakeId: jest.fn(),
};

describe("recalculateCaravanRanking (T004.3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const CARAVAN_ID = "00000000-0000-0000-0000-000000000001";
  const STAKE_ID = "11111111-1111-1111-1111-111111111111";

  const caravan: Caravan = {
    id: CARAVAN_ID,
    stake_id: STAKE_ID,
    departure_date: "2026-11-20T06:00:00Z",
    return_date: "2026-11-22T20:00:00Z",
    price_standard: 130.0,
    price_officiant: 117.0,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-11-15T23:59:59Z",
    min_quorum: 30,
    quorum_check_date: "2026-11-17T06:00:00Z",
    status: "open",
    caravan_leader_id: null,
    created_by: "admin-id",
    created_at: new Date().toISOString(),
  };

  function createMockReservation(
    index: number,
    confirmedAt: string,
    fundingSource: any = "membro",
    currentStatus: any = "confirmado"
  ): Reservation {
    return {
      id: `res-${index}`,
      stake_id: STAKE_ID,
      caravan_id: CARAVAN_ID,
      user_id: `user-${index}`,
      ward_id: "ward-1",
      seat_number: index,
      boarding_point_id: null,
      category: "standard",
      participant_type: "adulto",
      funding_source: fundingSource,
      is_preferential_seating: false,
      family_group_member_names: null,
      family_group_label: null,
      companion_for_endowment_name: null,
      status: currentStatus,
      payment_amount: 130.0,
      confirmed_at: confirmedAt,
      confirmation_rank: null,
      qr_token: null,
      qr_token_expires_at: null,
      created_at: `2026-10-01T10:00:00.${index}Z`,
    };
  }

  it("caso limite 48/49/50: todas as reservas dentro de seat_limit permanecem 'confirmado' com ranks 1 a N", async () => {
    mockCaravanRepository.findById.mockResolvedValueOnce(caravan);

    // Cria 50 reservas com datas de confirmação em sequência
    const reservations = Array.from({ length: 50 }, (_, i) =>
      createMockReservation(i + 1, `2026-10-02T10:${String(i).padStart(2, "0")}:00Z`)
    );

    mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce(reservations);
    mockReservationRepository.updateBatch.mockImplementationOnce(async (updates) =>
      updates.map((u) => ({
        ...reservations.find((r) => r.id === u.id)!,
        status: u.status,
        confirmation_rank: u.confirmation_rank ?? null,
      }))
    );

    const result = await recalculateCaravanRanking(CARAVAN_ID, {
      reservationRepository: mockReservationRepository,
      caravanRepository: mockCaravanRepository,
    });

    expect(result.confirmed).toHaveLength(50);
    expect(result.waitlisted).toHaveLength(0);
    expect(result.confirmed[0].confirmation_rank).toBe(1);
    expect(result.confirmed[49].confirmation_rank).toBe(50);
    expect(result.confirmed[49].status).toBe("confirmado");
  });

  it("caso limite 51: a 51ª reserva por data de confirmação é movida para 'lista_espera' com rank 51", async () => {
    mockCaravanRepository.findById.mockResolvedValueOnce(caravan);

    // 51 reservas
    const reservations = Array.from({ length: 51 }, (_, i) =>
      createMockReservation(i + 1, `2026-10-02T10:${String(i).padStart(2, "0")}:00Z`)
    );

    mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce(reservations);
    mockReservationRepository.updateBatch.mockImplementationOnce(async (updates) =>
      updates.map((u) => ({
        ...reservations.find((r) => r.id === u.id)!,
        status: u.status,
        confirmation_rank: u.confirmation_rank ?? null,
      }))
    );

    const result = await recalculateCaravanRanking(CARAVAN_ID, {
      reservationRepository: mockReservationRepository,
      caravanRepository: mockCaravanRepository,
    });

    expect(result.confirmed).toHaveLength(50);
    expect(result.waitlisted).toHaveLength(1);

    const waitlistedReservation = result.waitlisted[0];
    expect(waitlistedReservation.id).toBe("res-51");
    expect(waitlistedReservation.status).toBe("lista_espera");
    expect(waitlistedReservation.confirmation_rank).toBe(51);

    // Evento de mudança de posição gerado para a reserva que caiu para lista_espera
    expect(result.positionChangeEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reservationId: "res-51",
          previousStatus: "confirmado",
          newStatus: "lista_espera",
          newRank: 51,
        }),
      ])
    );
  });

  it("prioridade de membro vs convidado (D28): convidado é rankeado SEMPRE depois dos membros da estaca", async () => {
    mockCaravanRepository.findById.mockResolvedValueOnce(caravan);

    // 50 membros com data mais tardia (12:00)
    const members = Array.from({ length: 50 }, (_, i) =>
      createMockReservation(i + 1, `2026-10-02T12:${String(i).padStart(2, "0")}:00Z`, "membro")
    );

    // 1 convidado inter-estaca com data BEM MAIS CEDO (08:00)
    const guest = createMockReservation(
      51,
      "2026-10-02T08:00:00Z",
      "convidado_transferencia_interestaca"
    );

    // Lista total: 51 reservas (o convidado confirmou antes, mas é convidado)
    const allReservations = [guest, ...members];

    mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce(allReservations);
    mockReservationRepository.updateBatch.mockImplementationOnce(async (updates) =>
      updates.map((u) => ({
        ...allReservations.find((r) => r.id === u.id)!,
        status: u.status,
        confirmation_rank: u.confirmation_rank ?? null,
      }))
    );

    const result = await recalculateCaravanRanking(CARAVAN_ID, {
      reservationRepository: mockReservationRepository,
      caravanRepository: mockCaravanRepository,
    });

    // Os 50 membros ocupam as 50 vagas confirmadas
    expect(result.confirmed).toHaveLength(50);
    result.confirmed.forEach((res) => {
      expect(res.funding_source).not.toBe("convidado_transferencia_interestaca");
    });

    // O convidado cai para lista_espera mesmo tendo data de confirmação anterior
    expect(result.waitlisted).toHaveLength(1);
    expect(result.waitlisted[0].id).toBe("res-51");
    expect(result.waitlisted[0].funding_source).toBe("convidado_transferencia_interestaca");
    expect(result.waitlisted[0].confirmation_rank).toBe(51);
  });
});
