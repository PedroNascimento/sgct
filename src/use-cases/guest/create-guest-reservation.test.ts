/**
 * Testes para createGuestReservation (Spec 013 / T013.4)
 * TDD: Red -> Green -> Refactor
 */

import { createGuestReservation } from "./create-guest-reservation";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { GuestRepository } from "@/domain/interfaces/guest-repository";
import type { Caravan } from "@/domain/types/caravan";
import type { Profile } from "@/domain/types/tenant";
import type { Reservation } from "@/domain/types/reservation";
import type { GuestTransferConfirmation } from "@/domain/types/guest";

describe("createGuestReservation (Spec 013 / T013.4)", () => {
  const HOST_STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const CARAVAN_ID = "00000000-0000-0000-0000-000000000002";
  const GUEST_USER_ID = "00000000-0000-0000-0000-000000000003";

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

  const guestProfile: Profile = {
    id: GUEST_USER_ID,
    stake_id: HOST_STAKE_ID,
    ward_id: null,
    full_name: "Convidado de Mossoró",
    birth_date: "1990-08-10",
    sexo: "masculino",
    cpf: "12345678901",
    phone: "84999998888",
    role: "guest",
    home_stake_name: "Estaca Mossoró Brasil",
    home_ward_name: "Ala Abolição",
    is_minor: false,
    guardian_id: null,
    is_active: true,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCaravanRepository.findById.mockResolvedValue(caravan);
    mockProfileRepository.findById.mockResolvedValue(guestProfile);
  });

  it("cria reserva de convidado com status 'aguardando_transferencia_interestaca' e cria registro em guest_transfer_confirmations", async () => {
    const createdReservation: Reservation = {
      id: "res-guest-1",
      stake_id: HOST_STAKE_ID,
      ward_id: null,
      caravan_id: CARAVAN_ID,
      user_id: GUEST_USER_ID,
      seat_number: 12,
      category: "standard",
      participant_type: "adulto",
      funding_source: "convidado_transferencia_interestaca",
      is_preferential_seating: false,
      status: "aguardando_transferencia_interestaca",
      payment_amount: 130.0,
      created_at: new Date().toISOString(),
    };

    const createdTransfer: GuestTransferConfirmation = {
      id: "transfer-1",
      stake_id: HOST_STAKE_ID,
      reservation_id: "res-guest-1",
      origin_stake_name: "Estaca Mossoró Brasil",
      origin_ward_name: "Ala Abolição",
      amount: 130.0,
      confirmed_by: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    };

    mockReservationRepository.create.mockResolvedValueOnce(createdReservation);
    mockGuestRepository.createTransferConfirmation.mockResolvedValueOnce(createdTransfer);

    const result = await createGuestReservation(
      {
        userId: GUEST_USER_ID,
        caravanId: CARAVAN_ID,
        seatNumber: 12,
        originStakeName: "Estaca Mossoró Brasil",
        originWardName: "Ala Abolição",
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
        guestRepository: mockGuestRepository,
      }
    );

    expect(result.reservation.status).toBe("aguardando_transferencia_interestaca");
    expect(result.reservation.funding_source).toBe("convidado_transferencia_interestaca");
    expect(result.transferConfirmation.origin_stake_name).toBe("Estaca Mossoró Brasil");
    expect(result.transferConfirmation.amount).toBe(130.0);
    expect(mockGuestRepository.createTransferConfirmation).toHaveBeenCalledWith({
      reservation_id: "res-guest-1",
      stake_id: HOST_STAKE_ID,
      origin_stake_name: "Estaca Mossoró Brasil",
      origin_ward_name: "Ala Abolição",
      amount: 130.0,
    });
  });

  it("rejeita criação se usuário não possuir role 'guest'", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...guestProfile,
      role: "member",
    });

    await expect(
      createGuestReservation(
        {
          userId: GUEST_USER_ID,
          caravanId: CARAVAN_ID,
          seatNumber: 12,
          originStakeName: "Estaca Mossoró",
          originWardName: "Ala Centro",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Apenas usuários com papel de convidado podem criar reservas inter-Estaca.");
  });

  it("rejeita criação se perfil do usuário não for encontrado ou estiver inativo", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(null);

    await expect(
      createGuestReservation(
        {
          userId: GUEST_USER_ID,
          caravanId: CARAVAN_ID,
          seatNumber: 12,
          originStakeName: "Estaca Mossoró",
          originWardName: "Ala Centro",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Perfil de convidado não encontrado ou inativo.");
  });

  it("rejeita criação se caravana não for encontrada", async () => {
    mockCaravanRepository.findById.mockResolvedValueOnce(null);

    await expect(
      createGuestReservation(
        {
          userId: GUEST_USER_ID,
          caravanId: CARAVAN_ID,
          seatNumber: 12,
          originStakeName: "Estaca Mossoró",
          originWardName: "Ala Centro",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Caravana não encontrada.");
  });

  it("rejeita criação se inscrições da caravana não estiverem abertas", async () => {
    mockCaravanRepository.findById.mockResolvedValueOnce({
      ...caravan,
      status: "closed",
    });

    await expect(
      createGuestReservation(
        {
          userId: GUEST_USER_ID,
          caravanId: CARAVAN_ID,
          seatNumber: 12,
          originStakeName: "Estaca Mossoró",
          originWardName: "Ala Centro",
        },
        {
          reservationRepository: mockReservationRepository,
          caravanRepository: mockCaravanRepository,
          profileRepository: mockProfileRepository,
          guestRepository: mockGuestRepository,
        }
      )
    ).rejects.toThrow("Inscrições para esta caravana não estão abertas.");
  });

  it("calcula preço de oficiante se categoria for officiant", async () => {
    mockReservationRepository.create.mockImplementationOnce(async (data) => ({
      ...data,
      id: "res-officiant",
      stake_id: HOST_STAKE_ID,
      ward_id: null,
      created_at: new Date().toISOString(),
    } as any));
    mockGuestRepository.createTransferConfirmation.mockImplementationOnce(async (data) => ({
      ...data,
      id: "transfer-officiant",
      confirmed_by: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    } as any));

    const result = await createGuestReservation(
      {
        userId: GUEST_USER_ID,
        caravanId: CARAVAN_ID,
        seatNumber: 14,
        category: "officiant",
        originStakeName: "Estaca Mossoró",
        originWardName: "Ala Centro",
      },
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
        guestRepository: mockGuestRepository,
      }
    );

    expect(result.reservation.payment_amount).toBe(caravan.price_officiant);
    expect(result.transferConfirmation.amount).toBe(caravan.price_officiant);
  });
});
