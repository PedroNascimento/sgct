/**
 * Testes para addManifestEntry (T003.6)
 * Valida manifesto de crianças de colo (0 a 5 anos, sem assento, sem custo).
 * Artigo IV da Constituição: TDD obrigatório.
 */

import { addManifestEntry } from "./add-manifest-entry";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Caravan } from "@/domain/types/caravan";

const mockReservationRepository: jest.Mocked<ReservationRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCaravanId: jest.fn(),
  getSeatOccupancy: jest.fn(),
  addManifestEntry: jest.fn(),
  getManifestEntriesByReservationId: jest.fn(),
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

describe("addManifestEntry (T003.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";
  const CARAVAN_ID = "22222222-2222-2222-2222-222222222222";
  const USER_ID = "33333333-3333-3333-3333-333333333333";
  const RESERVATION_ID = "44444444-4444-4444-4444-444444444444";

  const existingReservation: Reservation = {
    id: RESERVATION_ID,
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: USER_ID,
    ward_id: WARD_ID,
    seat_number: 12,
    boarding_point_id: "55555555-5555-5555-5555-555555555555",
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "pendente",
    payment_amount: 150.0,
    created_at: new Date().toISOString(),
  };

  const caravan: Caravan = {
    id: CARAVAN_ID,
    stake_id: STAKE_ID,
    title: "Caravana ao Templo de Recife - Novembro",
    departure_at: "2026-11-20T06:00:00Z",
    arrival_at: "2026-11-22T20:00:00Z",
    status: "aberta",
    price_standard: 150.0,
    price_officiant: 100.0,
    created_by: "admin-id",
    created_at: new Date().toISOString(),
  };

  it("registra criança de colo com sucesso, sem consumir assento e sem cobrança", async () => {
    mockReservationRepository.findById.mockResolvedValue(existingReservation);
    mockCaravanRepository.findById.mockResolvedValue(caravan);

    const manifestEntry = {
      id: "entry-id-1",
      stake_id: STAKE_ID,
      ward_id: WARD_ID,
      reservation_id: RESERVATION_ID,
      full_name: "Criança de Colo Teste",
      birth_date: "2023-01-15", // ~3 anos na data de partida
      filiation: "Membro da Silva e Mãe da Silva",
    };

    mockReservationRepository.addManifestEntry.mockResolvedValue(manifestEntry);

    const result = await addManifestEntry(
      {
        userId: USER_ID,
        reservationId: RESERVATION_ID,
        fullName: "Criança de Colo Teste",
        birthDate: "2023-01-15",
        filiation: "Membro da Silva e Mãe da Silva",
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
      }
    );

    expect(result).toEqual(manifestEntry);
    // Valida que o manifesto não possui propriedade de assento ou valor financeiro
    expect((result as any).seat_number).toBeUndefined();
    expect((result as any).payment_amount).toBeUndefined();

    // Valida que a reserva não teve seu seat_number alterado e o repositório foi chamado corretamente
    expect(mockReservationRepository.addManifestEntry).toHaveBeenCalledWith({
      reservation_id: RESERVATION_ID,
      full_name: "Criança de Colo Teste",
      birth_date: "2023-01-15",
      filiation: "Membro da Silva e Mãe da Silva",
    });
  });

  it("rejeita inclusão de criança com mais de 5 anos na data da caravana", async () => {
    mockReservationRepository.findById.mockResolvedValue(existingReservation);
    mockCaravanRepository.findById.mockResolvedValue(caravan);

    // Partida: 2026-11-20. Nascida em 2020-05-10 tem 6 anos completos.
    await expect(
      addManifestEntry(
        {
          userId: USER_ID,
          reservationId: RESERVATION_ID,
          fullName: "Criança Maior",
          birthDate: "2020-05-10",
          filiation: "Membro da Silva",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
        }
      )
    ).rejects.toThrow("Criança de colo deve ter até 5 anos de idade na data da caravana.");

    expect(mockReservationRepository.addManifestEntry).not.toHaveBeenCalled();
  });

  it("rejeita inclusão se a reserva pertencer a outro usuário", async () => {
    mockReservationRepository.findById.mockResolvedValue(existingReservation);
    mockCaravanRepository.findById.mockResolvedValue(caravan);

    await expect(
      addManifestEntry(
        {
          userId: "outro-usuario-id",
          reservationId: RESERVATION_ID,
          fullName: "Criança Teste",
          birthDate: "2024-01-01",
          filiation: "Membro da Silva",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
        }
      )
    ).rejects.toThrow("Não autorizado: a reserva não pertence a este usuário.");

    expect(mockReservationRepository.addManifestEntry).not.toHaveBeenCalled();
  });

  it("rejeita se a reserva não existir", async () => {
    mockReservationRepository.findById.mockResolvedValue(null);

    await expect(
      addManifestEntry(
        {
          userId: USER_ID,
          reservationId: RESERVATION_ID,
          fullName: "Criança Teste",
          birthDate: "2024-01-01",
          filiation: "Membro da Silva",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
        }
      )
    ).rejects.toThrow("Reserva não encontrada.");

    expect(mockReservationRepository.addManifestEntry).not.toHaveBeenCalled();
  });
});
