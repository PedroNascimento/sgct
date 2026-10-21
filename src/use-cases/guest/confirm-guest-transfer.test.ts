/**
 * Testes para confirmGuestTransfer (Spec 013 / T013.5 / T013.7)
 * TDD: Red -> Green -> Refactor
 */

import { confirmGuestTransfer } from "./confirm-guest-transfer";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { GuestRepository } from "@/domain/interfaces/guest-repository";
import type { Caravan } from "@/domain/types/caravan";
import type { Profile } from "@/domain/types/tenant";
import type { Reservation } from "@/domain/types/reservation";
import type { GuestTransferConfirmation } from "@/domain/types/guest";

describe("confirmGuestTransfer (Spec 013 / T013.5 e T013.7)", () => {
  const HOST_STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const CARAVAN_ID = "00000000-0000-0000-0000-000000000002";
  const GUEST_USER_ID = "00000000-0000-0000-0000-000000000003";
  const ADMIN_ESTACA_ID = "00000000-0000-0000-0000-000000000004";
  const ADMIN_ALA_ID = "00000000-0000-0000-0000-000000000005";
  const TRANSFER_ID = "00000000-0000-0000-0000-000000000009";

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
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockGuestRepository: jest.Mocked<GuestRepository> = {
    createTransferConfirmation: jest.fn(),
    findTransferConfirmationById: jest.fn(),
    findTransferConfirmationByReservationId: jest.fn(),
    findPendingTransfersByStake: jest.fn(),
    confirmTransfer: jest.fn(),
  };

  const caravan: Caravan = {
    id: CARAVAN_ID,
    stake_id: HOST_STAKE_ID,
    departure_date: "2026-11-20T06:00:00Z",
    return_date: "2026-11-22T20:00:00Z",
    price_standard: 130.0,
    price_officiant: 117.0,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-11-15T23:59:59Z",
    min_quorum: 30,
    quorum_check_date: "2026-11-10T23:59:59Z",
    status: "open",
    created_at: new Date().toISOString(),
  };

  const adminEstacaProfile: Profile = {
    id: ADMIN_ESTACA_ID,
    stake_id: HOST_STAKE_ID,
    ward_id: null,
    full_name: "Admin da Estaca Anfitriã",
    birth_date: "1980-01-01",
    sexo: "masculino",
    cpf: "11111111111",
    phone: "84999991111",
    role: "admin_estaca",
    home_stake_name: null,
    home_ward_name: null,
    is_minor: false,
    guardian_id: null,
    is_active: true,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  const transferConfirmation: GuestTransferConfirmation = {
    id: TRANSFER_ID,
    stake_id: HOST_STAKE_ID,
    reservation_id: "res-guest-1",
    origin_stake_name: "Estaca Mossoró Brasil",
    origin_ward_name: "Ala Abolição",
    amount: 130.0,
    confirmed_by: null,
    confirmed_at: null,
    created_at: new Date().toISOString(),
  };

  const guestReservation: Reservation = {
    id: "res-guest-1",
    stake_id: HOST_STAKE_ID,
    ward_id: null,
    caravan_id: CARAVAN_ID,
    user_id: GUEST_USER_ID,
    seat_number: 15,
    category: "standard",
    participant_type: "adulto",
    funding_source: "convidado_transferencia_interestaca",
    is_preferential_seating: false,
    status: "aguardando_transferencia_interestaca",
    payment_amount: 130.0,
    created_at: "2026-10-01T10:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCaravanRepository.findById.mockResolvedValue(caravan);
    mockProfileRepository.findById.mockResolvedValue(adminEstacaProfile);
    mockGuestRepository.findTransferConfirmationById.mockResolvedValue(transferConfirmation);
    mockReservationRepository.findById.mockResolvedValue(guestReservation);
  });

  it("confirma repasse e transiciona reserva para 'confirmado' quando há vaga e sem fila de espera (US-013.2)", async () => {
    mockGuestRepository.confirmTransfer.mockResolvedValueOnce({
      ...transferConfirmation,
      confirmed_by: ADMIN_ESTACA_ID,
      confirmed_at: new Date().toISOString(),
    });

    // Apenas essa reserva na caravana (abaixo de 50)
    mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce([
      {
        ...guestReservation,
        status: "confirmado",
        confirmed_at: new Date().toISOString(),
      },
    ]);

    mockReservationRepository.updateBatch.mockResolvedValueOnce([
      {
        ...guestReservation,
        status: "confirmado",
        confirmation_rank: 1,
      },
    ]);

    const result = await confirmGuestTransfer(
      {
        transferConfirmationId: TRANSFER_ID,
        confirmedBy: ADMIN_ESTACA_ID,
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
        guestRepository: mockGuestRepository,
      }
    );

    expect(result.status).toBe("confirmado");
    expect(mockGuestRepository.confirmTransfer).toHaveBeenCalledWith(TRANSFER_ID, ADMIN_ESTACA_ID);
  });

  it("T013.7 (Teste Crítico): membro da anfitriã em 'lista_espera' + convidado com repasse confirmado -> convidado permanece em 'lista_espera'", async () => {
    mockGuestRepository.confirmTransfer.mockResolvedValueOnce({
      ...transferConfirmation,
      confirmed_by: ADMIN_ESTACA_ID,
      confirmed_at: new Date().toISOString(),
    });

    // Simula caravana com capacidade 1 assento preenchido por membro da anfitriã
    mockCaravanRepository.findById.mockResolvedValueOnce({
      ...caravan,
      seat_limit: 1,
    });

    const hostMemberRes: Reservation = {
      id: "res-host-member",
      stake_id: HOST_STAKE_ID,
      ward_id: "ward-host-1",
      caravan_id: CARAVAN_ID,
      user_id: "user-host-1",
      seat_number: 1,
      category: "standard",
      participant_type: "adulto",
      funding_source: "membro",
      is_preferential_seating: false,
      status: "confirmado",
      payment_amount: 130.0,
      confirmed_at: "2026-10-02T10:00:00Z",
      created_at: "2026-10-02T10:00:00Z",
    };

    const hostWaitlistedMember: Reservation = {
      id: "res-host-waitlist",
      stake_id: HOST_STAKE_ID,
      ward_id: "ward-host-2",
      caravan_id: CARAVAN_ID,
      user_id: "user-host-2",
      seat_number: 2,
      category: "standard",
      participant_type: "adulto",
      funding_source: "membro",
      is_preferential_seating: false,
      status: "lista_espera",
      payment_amount: 130.0,
      confirmed_at: "2026-10-03T10:00:00Z",
      created_at: "2026-10-03T10:00:00Z",
    };

    // Convidado confirmou repasse antes do membro da lista de espera (ex: dia 01/10)
    const guestResConfirmedTransfer: Reservation = {
      ...guestReservation,
      status: "confirmado",
      confirmed_at: "2026-10-01T10:00:00Z",
    };

    mockReservationRepository.findByCaravanAndStatuses.mockResolvedValueOnce([
      hostMemberRes,
      hostWaitlistedMember,
      guestResConfirmedTransfer,
    ]);

    mockReservationRepository.updateBatch.mockImplementationOnce(async (updates) =>
      updates.map((u) => ({
        ...(u.id === hostMemberRes.id
          ? hostMemberRes
          : u.id === hostWaitlistedMember.id
          ? hostWaitlistedMember
          : guestReservation),
        status: u.status,
        confirmation_rank: u.confirmation_rank ?? null,
      }))
    );

    const result = await confirmGuestTransfer(
      {
        transferConfirmationId: TRANSFER_ID,
        confirmedBy: ADMIN_ESTACA_ID,
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
        guestRepository: mockGuestRepository,
      }
    );

    // O convidado DEVE ficar em lista de espera, e o membro da anfitriã tem prioridade
    expect(result.status).toBe("lista_espera");
  });

  it("rejeita confirmação se admin não for encontrado ou estiver inativo", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(null);

    await expect(
      confirmGuestTransfer(
        {
          transferConfirmationId: TRANSFER_ID,
          confirmedBy: ADMIN_ESTACA_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Administrador não encontrado ou inativo.");
  });

  it("rejeita confirmação se registro de transferência não for encontrado", async () => {
    mockGuestRepository.findTransferConfirmationById.mockResolvedValueOnce(null);

    await expect(
      confirmGuestTransfer(
        {
          transferConfirmationId: TRANSFER_ID,
          confirmedBy: ADMIN_ESTACA_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Confirmação de transferência inter-Estaca não encontrada.");
  });

  it("rejeita confirmação se o repasse pertencer a outra Estaca", async () => {
    mockGuestRepository.findTransferConfirmationById.mockResolvedValueOnce({
      ...transferConfirmation,
      stake_id: "00000000-0000-0000-0000-000000000999",
    });

    await expect(
      confirmGuestTransfer(
        {
          transferConfirmationId: TRANSFER_ID,
          confirmedBy: ADMIN_ESTACA_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Não autorizado: este repasse pertence a outra Estaca.");
  });

  it("rejeita confirmação se o repasse já tiver sido confirmado anteriormente", async () => {
    mockGuestRepository.findTransferConfirmationById.mockResolvedValueOnce({
      ...transferConfirmation,
      confirmed_at: "2026-10-10T10:00:00Z",
    });

    await expect(
      confirmGuestTransfer(
        {
          transferConfirmationId: TRANSFER_ID,
          confirmedBy: ADMIN_ESTACA_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Este repasse de convidado já foi confirmado anteriormente.");
  });

  it("rejeita confirmação se a reserva associada não for encontrada", async () => {
    mockReservationRepository.findById.mockResolvedValueOnce(null);

    await expect(
      confirmGuestTransfer(
        {
          transferConfirmationId: TRANSFER_ID,
          confirmedBy: ADMIN_ESTACA_ID,
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Reserva vinculada ao repasse não encontrada.");
  });
});
