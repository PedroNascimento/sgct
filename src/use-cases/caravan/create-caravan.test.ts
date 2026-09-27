/**
 * TDD: Testes para createCaravan (T002.1)
 * RED phase — Artigo IV da Constituição.
 *
 * Requisito Não-Negociável:
 * `createCaravan` sempre grava o `stake_id` da sessão do admin_estaca autenticado,
 * ignorando qualquer valor forjado ou enviado pelo cliente (Artigo II.c).
 */

import { createCaravan } from "./create-caravan";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { CreateCaravanInput } from "@/domain/schemas/caravan";

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

describe("createCaravan (T002.1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_NATAL_ID = "00000000-0000-0000-0000-000000000001";
  const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const adminEstacaProfile = {
    id: ADMIN_ID,
    stake_id: STAKE_NATAL_ID,
    role: "admin_estaca" as const,
    full_name: "Admin da Estaca Natal",
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

  const validPayload: CreateCaravanInput = {
    departureDate: "2026-10-15",
    returnDate: "2026-10-18",
    priceStandard: 130.0,
    priceOfficiant: 117.0,
    seatLimit: 50,
    waitlistLimit: 5,
    registrationDeadline: "2026-10-11",
    minQuorum: 48,
    quorumCheckDate: "2026-10-13",
    boardingPoints: [
      { name: "Capela Tirol", boardingTime: "2026-10-15T20:00:00Z" },
      { name: "Capela Candelária", boardingTime: "2026-10-15T20:45:00Z" },
    ],
  };

  it("cria caravana associando estritamente o stake_id da sessão do admin (T002.1)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaProfile);

    const createdCaravanMock = {
      id: "caravan-uuid-1",
      stake_id: STAKE_NATAL_ID,
      departure_date: validPayload.departureDate,
      return_date: validPayload.returnDate ?? null,
      price_standard: validPayload.priceStandard,
      price_officiant: validPayload.priceOfficiant,
      seat_limit: validPayload.seatLimit,
      waitlist_limit: validPayload.waitlistLimit,
      registration_deadline: validPayload.registrationDeadline,
      min_quorum: validPayload.minQuorum,
      quorum_check_date: validPayload.quorumCheckDate,
      status: "open" as const,
      caravan_leader_id: null,
      created_by: ADMIN_ID,
      created_at: new Date().toISOString(),
    };

    mockCaravanRepository.create.mockResolvedValueOnce(createdCaravanMock);
    mockCaravanRepository.addBoardingPoint.mockImplementation(async (bp) => ({
      id: "bp-uuid",
      ...bp,
    }));

    // Tentativa maliciosa de injetar payload com stakeId forjado de outra Estaca
    const forgedPayload = {
      ...validPayload,
      stakeId: "99999999-9999-9999-9999-999999999999",
      stake_id: "99999999-9999-9999-9999-999999999999",
    };

    const result = await createCaravan(forgedPayload, ADMIN_ID, {
      caravanRepository: mockCaravanRepository,
      profileRepository: mockProfileRepository,
    });

    // Confirma que o stake_id persistido veio do perfil do admin e não do payload forjado
    expect(result.stake_id).toBe(STAKE_NATAL_ID);
    expect(mockCaravanRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stake_id: STAKE_NATAL_ID,
        created_by: ADMIN_ID,
        price_standard: 130,
        price_officiant: 117,
      })
    );

    // Confirma que os dois pontos de embarque foram criados com o stake_id do admin
    expect(mockCaravanRepository.addBoardingPoint).toHaveBeenCalledTimes(2);
    expect(mockCaravanRepository.addBoardingPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        caravan_id: "caravan-uuid-1",
        stake_id: STAKE_NATAL_ID,
        name: "Capela Tirol",
      })
    );
  });

  it("rejeita criação se o usuário executor não for admin_estaca", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...adminEstacaProfile,
      role: "member",
    });

    await expect(
      createCaravan(validPayload, ADMIN_ID, {
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Apenas administradores de Estaca podem criar caravanas.");

    expect(mockCaravanRepository.create).not.toHaveBeenCalled();
  });

  it("rejeita criação se a lista de pontos de embarque for vazia", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaProfile);

    const payloadWithoutBoarding = {
      ...validPayload,
      boardingPoints: [],
    };

    await expect(
      createCaravan(payloadWithoutBoarding, ADMIN_ID, {
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Ao menos um ponto de embarque deve ser informado.");

    expect(mockCaravanRepository.create).not.toHaveBeenCalled();
  });
});
