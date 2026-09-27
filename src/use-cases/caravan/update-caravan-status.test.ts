/**
 * TDD: Testes para updateCaravanStatus (T002.3, T002.4)
 * RED phase — Artigo IV da Constituição.
 *
 * Requisito Não-Negociável:
 * Admin Estaca da Estaca A tentando editar/cancelar caravana da Estaca B
 * deve ser estritamente bloqueado (Artigo II.a e II.d).
 */

import { updateCaravanStatus } from "./update-caravan-status";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Caravan } from "@/domain/types/caravan";

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

describe("updateCaravanStatus (T002.3, T002.4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";
  const STAKE_B_ID = "00000000-0000-0000-0000-000000000002";
  const ADMIN_ESTACA_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const CARAVAN_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const CARAVAN_A_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  const adminEstacaA = {
    id: ADMIN_ESTACA_A_ID,
    stake_id: STAKE_A_ID,
    role: "admin_estaca" as const,
    full_name: "Admin Estaca A",
    birth_date: "1980-01-01",
    is_active: true,
    is_minor: false,
    ward_id: null,
    cpf: null,
    phone: null,
    sexo: "masculino" as const,
    home_stake_name: null,
    home_ward_name: null,
    guardian_id: null,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  const caravanB: Caravan = {
    id: CARAVAN_B_ID,
    stake_id: STAKE_B_ID, // Caravana pertence à Estaca B
    departure_date: "2026-11-20",
    return_date: "2026-11-23",
    price_standard: 130,
    price_officiant: 117,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-11-15",
    min_quorum: 48,
    quorum_check_date: "2026-11-17",
    status: "open",
    caravan_leader_id: null,
    created_by: "outro-user",
    created_at: new Date().toISOString(),
  };

  const caravanA: Caravan = {
    ...caravanB,
    id: CARAVAN_A_ID,
    stake_id: STAKE_A_ID, // Caravana pertence à Estaca A
  };

  it("rejeita quando Admin Estaca da Estaca A tenta cancelar caravana da Estaca B (T002.3)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaA);
    mockCaravanRepository.findById.mockResolvedValueOnce(caravanB);

    await expect(
      updateCaravanStatus(
        { caravanId: CARAVAN_B_ID, status: "cancelled" },
        ADMIN_ESTACA_A_ID,
        {
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Você não tem permissão para alterar caravanas de outra Estaca.");

    expect(mockCaravanRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("atualiza com sucesso o status de uma caravana da própria Estaca (T002.4)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaA);
    mockCaravanRepository.findById.mockResolvedValueOnce(caravanA);
    mockCaravanRepository.updateStatus.mockResolvedValueOnce({
      ...caravanA,
      status: "cancelled",
    });

    const result = await updateCaravanStatus(
      { caravanId: CARAVAN_A_ID, status: "cancelled" },
      ADMIN_ESTACA_A_ID,
      {
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.status).toBe("cancelled");
    expect(mockCaravanRepository.updateStatus).toHaveBeenCalledWith(
      CARAVAN_A_ID,
      "cancelled"
    );
  });

  it("rejeita operação se o usuário não for admin_estaca", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...adminEstacaA,
      role: "member",
    });

    await expect(
      updateCaravanStatus(
        { caravanId: CARAVAN_A_ID, status: "cancelled" },
        ADMIN_ESTACA_A_ID,
        {
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Apenas administradores de Estaca podem alterar status de caravanas.");

    expect(mockCaravanRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejeita operação se a caravana não existir", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaA);
    mockCaravanRepository.findById.mockResolvedValueOnce(null);

    await expect(
      updateCaravanStatus(
        { caravanId: "00000000-0000-0000-0000-000000000000", status: "cancelled" },
        ADMIN_ESTACA_A_ID,
        {
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Caravana não encontrada.");

    expect(mockCaravanRepository.updateStatus).not.toHaveBeenCalled();
  });
});
