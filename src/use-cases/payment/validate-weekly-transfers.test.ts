/**
 * Testes para validateWeeklyTransfers (T004.4 e T004.5).
 *
 * Regras:
 * - Valida transferências em lote: transiciona pago_ala → confirmado (US-004.2).
 * - Chama recalculateCaravanRanking internamente para atribuir ranks e lista de espera (T004.4).
 * - Bloqueio na semana de embarque para execuções automáticas do cron (T004.5 / US-004.2).
 * - Apenas Admin Estaca da própria estaca pode disparar manualmente (Artigo II).
 */

import { validateWeeklyTransfers } from "./validate-weekly-transfers";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Caravan } from "@/domain/types/caravan";
import type { Profile } from "@/domain/types/tenant";

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

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("validateWeeklyTransfers (T004.4 e T004.5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const CARAVAN_ID = "00000000-0000-0000-0000-000000000001";
  const STAKE_ID = "11111111-1111-1111-1111-111111111111";
  const ADMIN_ESTACA_ID = "22222222-2222-2222-2222-222222222222";

  // Caravana parte dia 2026-11-20
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
    created_by: ADMIN_ESTACA_ID,
    created_at: new Date().toISOString(),
  };

  const adminEstacaProfile: Profile = {
    id: ADMIN_ESTACA_ID,
    stake_id: STAKE_ID,
    ward_id: null,
    role: "admin_estaca",
    full_name: "Admin da Estaca",
    cpf: "111.111.111-11",
    birth_date: "1980-01-01",
    phone: "84999999999",
    sexo: "masculino",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const pagoAlaReservation: Reservation = {
    id: "res-pago-1",
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: "user-1",
    ward_id: "ward-1",
    seat_number: 10,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "pago_ala",
    payment_amount: 130.0,
    confirmed_at: null,
    confirmation_rank: null,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-10-01T10:00:00Z",
  };

  it("valida transferências semanais com sucesso e recalcula ranking (T004.4)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaProfile);
    mockCaravanRepository.findById.mockResolvedValue(caravan);

    mockReservationRepository.findByCaravanAndStatuses
      .mockResolvedValueOnce([pagoAlaReservation]) // Busca reservas com status pago_ala
      .mockResolvedValueOnce([
        {
          ...pagoAlaReservation,
          status: "confirmado",
          confirmed_at: "2026-10-14T09:00:00Z",
        },
      ]); // Chamada do recálculo de ranking

    mockReservationRepository.updateBatch.mockImplementation(async (updates) =>
      updates.map((u) => ({
        ...pagoAlaReservation,
        status: u.status,
        confirmation_rank: u.confirmation_rank ?? 1,
        confirmed_at: u.confirmed_at ?? "2026-10-14T09:00:00Z",
      }))
    );

    const result = await validateWeeklyTransfers(
      {
        caravanId: CARAVAN_ID,
        adminId: ADMIN_ESTACA_ID,
        currentDate: "2026-10-14T09:00:00Z", // Mais de 7 dias antes do embarque (2026-11-20)
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.skipped).toBe(false);
    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0].status).toBe("confirmado");
    expect(result.confirmed[0].confirmation_rank).toBe(1);
  });

  it("não executa validação automática na semana do próprio embarque (T004.5 / US-004.2)", async () => {
    mockCaravanRepository.findById.mockResolvedValue(caravan);

    // Embarque: 2026-11-20. Data atual do teste: 2026-11-17 (3 dias antes = semana do embarque)
    const result = await validateWeeklyTransfers(
      {
        caravanId: CARAVAN_ID,
        isAutomatedJob: true,
        currentDate: "2026-11-17T06:00:00Z",
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
      }
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("semana do embarque");
    expect(mockReservationRepository.updateBatch).not.toHaveBeenCalled();
  });

  it("rejeita chamada manual se o usuário não for Admin Estaca daquela caravana", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...adminEstacaProfile,
      role: "admin_ala", // Admin de Ala não pode validar transferências da Estaca
    });
    mockCaravanRepository.findById.mockResolvedValue(caravan);

    await expect(
      validateWeeklyTransfers(
        {
          caravanId: CARAVAN_ID,
          adminId: ADMIN_ESTACA_ID,
          currentDate: "2026-10-14T09:00:00Z",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem validar transferências semanais.");
  });
});
