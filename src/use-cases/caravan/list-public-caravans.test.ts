/**
 * TDD: Testes para listPublicCaravans (T002.6, T002.7)
 * RED phase — Artigo IV da Constituição.
 *
 * Requisito Não-Negociável:
 * `listPublicCaravans` retorna apenas caravanas da stake_id informada,
 * contendo status agregados de ocupação e NENHUM campo de PII (Artigo II e US-002.2).
 */

import { listPublicCaravans } from "./list-public-caravans";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { CaravanPublicSummary } from "@/domain/types/caravan";

const mockCaravanRepository: jest.Mocked<CaravanRepository> = {
  findById: jest.fn(),
  findByStakeId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  addBoardingPoint: jest.fn(),
  getBoardingPointsByCaravanId: jest.fn(),
  findPublicSummariesByStakeId: jest.fn(),
};

describe("listPublicCaravans (T002.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_NATAL_ID = "00000000-0000-0000-0000-000000000001";

  const publicSummariesMock: CaravanPublicSummary[] = [
    {
      id: "caravan-1",
      stake_id: STAKE_NATAL_ID,
      departure_date: "2026-11-20",
      return_date: "2026-11-23",
      price_standard: 130,
      price_officiant: 117,
      status: "open",
      seat_limit: 50,
      available_seats: 35,
      confirmed_seats: 10,
      validating_seats: 5,
      waitlist_seats: 0,
      boarding_points: [
        { name: "Capela Tirol", boarding_time: "2026-11-20T20:00:00Z" },
      ],
    },
  ];

  it("retorna apenas resumos da stake_id informada sem nenhum campo de PII (T002.6)", async () => {
    mockCaravanRepository.findPublicSummariesByStakeId.mockResolvedValueOnce(
      publicSummariesMock
    );

    const result = await listPublicCaravans(STAKE_NATAL_ID, {
      caravanRepository: mockCaravanRepository,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("caravan-1");
    expect(result[0].available_seats).toBe(35);
    expect(result[0].confirmed_seats).toBe(10);
    expect(result[0].validating_seats).toBe(5);

    // Garantia de ausência de PII em qualquer objeto retornado
    const keys = Object.keys(result[0]);
    expect(keys).not.toContain("full_name");
    expect(keys).not.toContain("cpf");
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("ward_name");
    expect(keys).not.toContain("user_id");

    expect(mockCaravanRepository.findPublicSummariesByStakeId).toHaveBeenCalledWith(
      STAKE_NATAL_ID
    );
  });

  it("rejeita chamada se o stake_id for inválido", async () => {
    await expect(
      listPublicCaravans("stake-invalida", {
        caravanRepository: mockCaravanRepository,
      })
    ).rejects.toThrow("ID da Estaca inválido.");

    expect(mockCaravanRepository.findPublicSummariesByStakeId).not.toHaveBeenCalled();
  });
});
