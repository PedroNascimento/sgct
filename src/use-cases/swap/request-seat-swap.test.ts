/**
 * Testes para requestSeatSwap (T005.3).
 * Spec 005 / US-005.2
 *
 * Regras:
 * - Membro titular ou Admin registra solicitação de permuta informando novo titular.
 * - Reserva precisa estar confirmada.
 * - Zod validação e isolamento multi-tenant.
 */

import { requestSeatSwap } from "./request-seat-swap";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { SwapRepository } from "@/domain/interfaces/swap-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Profile } from "@/domain/types/tenant";
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

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("requestSeatSwap (T005.3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";
  const CARAVAN_ID = "22222222-2222-2222-2222-222222222222";
  const USER_ID = "33333333-3333-3333-3333-333333333333";
  const OTHER_USER_ID = "44444444-4444-4444-4444-444444444444";
  const RESERVATION_ID = "55555555-5555-5555-5555-555555555555";

  const memberProfile: Profile = {
    id: USER_ID,
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    role: "member",
    full_name: "Titular Original",
    cpf: "111.111.111-11",
    birth_date: "1990-01-01",
    phone: "(84) 99999-9999",
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
  };

  const confirmedReservation: Reservation = {
    id: RESERVATION_ID,
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: USER_ID,
    ward_id: WARD_ID,
    seat_number: 12,
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

  it("cria solicitação de permuta com sucesso quando solicitado pelo titular da reserva", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);

    const createdSwap: SeatSwapRequest = {
      id: "swap-uuid-1",
      stake_id: STAKE_ID,
      ward_id: WARD_ID,
      original_reservation_id: RESERVATION_ID,
      new_holder_full_name: "Novo Passageiro Silva",
      new_holder_document: "222.222.222-22",
      requested_by: USER_ID,
      status: "pending",
      created_at: "2026-08-10T10:00:00Z",
    };

    mockSwapRepository.create.mockResolvedValueOnce(createdSwap);

    const result = await requestSeatSwap(
      {
        reservationId: RESERVATION_ID,
        newHolderFullName: "Novo Passageiro Silva",
        newHolderDocument: "222.222.222-22",
        requestedBy: USER_ID,
      },
      {
        reservationRepository: mockReservationRepository,
        swapRepository: mockSwapRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(mockSwapRepository.create).toHaveBeenCalledWith({
      original_reservation_id: RESERVATION_ID,
      new_holder_full_name: "Novo Passageiro Silva",
      new_holder_document: "222.222.222-22",
      requested_by: USER_ID,
      status: "pending",
    });

    expect(result.id).toBe("swap-uuid-1");
    expect(result.status).toBe("pending");
  });

  it("rejeita se o solicitante não for o dono da reserva nem admin", async () => {
    const otherProfile: Profile = {
      ...memberProfile,
      id: OTHER_USER_ID,
      full_name: "Outro Membro",
    };

    mockProfileRepository.findById.mockResolvedValueOnce(otherProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);

    await expect(
      requestSeatSwap(
        {
          reservationId: RESERVATION_ID,
          newHolderFullName: "Novo Passageiro",
          requestedBy: OTHER_USER_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          swapRepository: mockSwapRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Você não tem permissão para solicitar permuta desta reserva.");
  });

  it("rejeita se a reserva não estiver em status confirmado", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockReservationRepository.findById.mockResolvedValueOnce({
      ...confirmedReservation,
      status: "pendente",
    });

    await expect(
      requestSeatSwap(
        {
          reservationId: RESERVATION_ID,
          newHolderFullName: "Novo Passageiro",
          requestedBy: USER_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          swapRepository: mockSwapRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Apenas reservas com status 'confirmado' podem ter permuta solicitada.");
  });

  it("permite que o Admin da Estaca solicite a permuta para uma reserva de sua estaca", async () => {
    const adminProfile: Profile = {
      ...memberProfile,
      id: OTHER_USER_ID,
      role: "admin_estaca",
      full_name: "Admin Estaca",
    };

    mockProfileRepository.findById.mockResolvedValueOnce(adminProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(confirmedReservation);
    mockSwapRepository.create.mockResolvedValueOnce({
      id: "swap-uuid-admin",
      stake_id: STAKE_ID,
      ward_id: WARD_ID,
      original_reservation_id: RESERVATION_ID,
      new_holder_full_name: "Novo Passageiro",
      new_holder_document: null,
      requested_by: OTHER_USER_ID,
      status: "pending",
      created_at: "2026-08-10T10:00:00Z",
    });

    const result = await requestSeatSwap(
      {
        reservationId: RESERVATION_ID,
        newHolderFullName: "Novo Passageiro",
        requestedBy: OTHER_USER_ID,
      },
      {
        reservationRepository: mockReservationRepository,
        swapRepository: mockSwapRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.id).toBe("swap-uuid-admin");
  });

  it("rejeita se o solicitante não for encontrado ou estiver inativo", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(null);

    await expect(
      requestSeatSwap(
        {
          reservationId: RESERVATION_ID,
          newHolderFullName: "Novo Passageiro",
          requestedBy: USER_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          swapRepository: mockSwapRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Solicitante não encontrado ou inativo.");
  });

  it("rejeita se a reserva não for encontrada", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(null);

    await expect(
      requestSeatSwap(
        {
          reservationId: RESERVATION_ID,
          newHolderFullName: "Novo Passageiro",
          requestedBy: USER_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          swapRepository: mockSwapRepository,
          profileRepository: mockProfileRepository,
        }
      )
    ).rejects.toThrow("Reserva não encontrada.");
  });
});
