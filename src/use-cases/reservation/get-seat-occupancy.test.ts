/**
 * Testes para getSeatOccupancy (T003.8)
 * Regra US-003.4: Ocupação visível entre Alas da mesma Estaca sem PII
 * Artigo II e V da Constituição: Isolamento por stake_id e Privacidade de Dados.
 */

import { getSeatOccupancy } from "./get-seat-occupancy";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { SeatOccupancy } from "@/domain/types/reservation";

const mockReservationRepository: jest.Mocked<ReservationRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCaravanId: jest.fn(),
  getSeatOccupancy: jest.fn(),
  addManifestEntry: jest.fn(),
  getManifestEntriesByReservationId: jest.fn(),
};

describe("getSeatOccupancy (T003.8)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";
  const CARAVAN_ID = "22222222-2222-2222-2222-222222222222";

  it("retorna apenas seat_number e occupancy_status sem qualquer coluna de PII", async () => {
    const rawOccupancyData = [
      { seat_number: 1, occupancy_status: "ocupado" as const },
      { seat_number: 2, occupancy_status: "livre" as const },
      // Simulando caso o banco trouxesse campos extras acidentalmente
      {
        seat_number: 3,
        occupancy_status: "ocupado" as const,
        user_id: "user-secret",
        full_name: "Fulano de Tal",
        cpf: "123.456.789-00",
        ward_id: "ward-secret",
        payment_status: "pago_estaca",
      },
    ];

    mockReservationRepository.getSeatOccupancy.mockResolvedValue(rawOccupancyData as any);

    const result = await getSeatOccupancy(
      {
        caravanId: CARAVAN_ID,
        stakeId: STAKE_A_ID,
      },
      {
        reservationRepository: mockReservationRepository,
      }
    );

    expect(mockReservationRepository.getSeatOccupancy).toHaveBeenCalledWith(CARAVAN_ID, STAKE_A_ID);
    expect(result).toHaveLength(3);

    // Valida estritamente que nenhum objeto retornado contém PII
    result.forEach((seat) => {
      expect(seat).toHaveProperty("seat_number");
      expect(seat).toHaveProperty("occupancy_status");
      expect((seat as any).user_id).toBeUndefined();
      expect((seat as any).full_name).toBeUndefined();
      expect((seat as any).cpf).toBeUndefined();
      expect((seat as any).ward_id).toBeUndefined();
      expect((seat as any).payment_status).toBeUndefined();
      expect(Object.keys(seat).sort()).toEqual([
        "caravan_id",
        "occupancy_status",
        "seat_number",
        "stake_id",
      ]);
    });
  });

  it("rejeita chamada com IDs inválidos (não UUID)", async () => {
    await expect(
      getSeatOccupancy(
        {
          caravanId: "invalid-uuid",
          stakeId: STAKE_A_ID,
        },
        {
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow();

    await expect(
      getSeatOccupancy(
        {
          caravanId: CARAVAN_ID,
          stakeId: "invalid-uuid",
        },
        {
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow();

    expect(mockReservationRepository.getSeatOccupancy).not.toHaveBeenCalled();
  });
});
