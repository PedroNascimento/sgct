/**
 * Testes para confirmWardPayment (T004.1)
 * Regras:
 * - Transição pendente → pago_ala (US-004.1)
 * - Bloqueio de autoaprovação (US-004.1)
 * - Isolamento multi-tenant por ward_id e stake_id (Artigo II)
 * - TDD obrigatório (Artigo IV)
 */

import { confirmWardPayment } from "./confirm-ward-payment";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Reservation } from "@/domain/types/reservation";
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

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("confirmWardPayment (T004.1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_NATAL_ID = "00000000-0000-0000-0000-000000000001";
  const STAKE_OUTRA_ID = "00000000-0000-0000-0000-000000000002";
  const WARD_TIROL_ID = "11111111-1111-1111-1111-111111111111";
  const WARD_PETROPOLIS_ID = "11111111-1111-1111-1111-111111111112";

  const ADMIN_ALA_ID = "22222222-2222-2222-2222-222222222222";
  const ADMIN_ESTACA_ID = "33333333-3333-3333-3333-333333333333";
  const MEMBER_USER_ID = "44444444-4444-4444-4444-444444444444";
  const RESERVATION_ID = "55555555-5555-5555-5555-555555555555";
  const CARAVAN_ID = "66666666-6666-6666-6666-666666666666";

  const adminAlaProfile: Profile = {
    id: ADMIN_ALA_ID,
    stake_id: STAKE_NATAL_ID,
    ward_id: WARD_TIROL_ID,
    role: "admin_ala",
    full_name: "Líder da Ala Tirol",
    cpf: "111.111.111-11",
    birth_date: "1980-01-01",
    phone: "84988888888",
    sexo: "masculino",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const pendingReservation: Reservation = {
    id: RESERVATION_ID,
    stake_id: STAKE_NATAL_ID,
    caravan_id: CARAVAN_ID,
    user_id: MEMBER_USER_ID,
    ward_id: WARD_TIROL_ID,
    seat_number: 10,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "pendente",
    payment_amount: 130.0,
    confirmed_at: null,
    confirmation_rank: null,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: new Date().toISOString(),
  };

  it("transiciona reserva de 'pendente' para 'pago_ala' com sucesso", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminAlaProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(pendingReservation);
    mockReservationRepository.updateStatus.mockResolvedValueOnce({
      ...pendingReservation,
      status: "pago_ala",
    });

    const result = await confirmWardPayment(
      { reservationId: RESERVATION_ID, adminId: ADMIN_ALA_ID },
      { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
    );

    expect(result.status).toBe("pago_ala");
    expect(mockReservationRepository.updateStatus).toHaveBeenCalledWith(RESERVATION_ID, {
      status: "pago_ala",
    });
  });

  it("bloqueia autoaprovação quando o Admin Ala tenta confirmar sua própria reserva (US-004.1)", async () => {
    const ownReservation: Reservation = {
      ...pendingReservation,
      user_id: ADMIN_ALA_ID, // Reserva feita pelo próprio admin
    };

    mockProfileRepository.findById.mockResolvedValueOnce(adminAlaProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(ownReservation);

    await expect(
      confirmWardPayment(
        { reservationId: RESERVATION_ID, adminId: ADMIN_ALA_ID },
        { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
      )
    ).rejects.toThrow(
      "Bloqueio de autoaprovação: você não pode confirmar o pagamento da sua própria reserva."
    );

    expect(mockReservationRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("bloqueia confirmação quando a reserva pertence a outra Ala da mesma Estaca (Artigo II)", async () => {
    const otherWardReservation: Reservation = {
      ...pendingReservation,
      ward_id: WARD_PETROPOLIS_ID,
    };

    mockProfileRepository.findById.mockResolvedValueOnce(adminAlaProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(otherWardReservation);

    await expect(
      confirmWardPayment(
        { reservationId: RESERVATION_ID, adminId: ADMIN_ALA_ID },
        { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
      )
    ).rejects.toThrow("Não autorizado: reserva pertence a outra Ala.");

    expect(mockReservationRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("bloqueia confirmação quando a reserva pertence a outra Estaca (Artigo II)", async () => {
    const otherStakeReservation: Reservation = {
      ...pendingReservation,
      stake_id: STAKE_OUTRA_ID,
    };

    mockProfileRepository.findById.mockResolvedValueOnce(adminAlaProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(otherStakeReservation);

    await expect(
      confirmWardPayment(
        { reservationId: RESERVATION_ID, adminId: ADMIN_ALA_ID },
        { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
      )
    ).rejects.toThrow("Não autorizado: reserva pertence a outra Estaca.");

    expect(mockReservationRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejeita confirmação se o usuário for membro comum (sem permissão de admin)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...adminAlaProfile,
      role: "member",
    });

    await expect(
      confirmWardPayment(
        { reservationId: RESERVATION_ID, adminId: ADMIN_ALA_ID },
        { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
      )
    ).rejects.toThrow("Apenas administradores de Ala ou Estaca podem confirmar pagamentos.");

    expect(mockReservationRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejeita confirmação se o status da reserva não for 'pendente'", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(adminAlaProfile);
    mockReservationRepository.findById.mockResolvedValueOnce({
      ...pendingReservation,
      status: "cancelada_com_credito",
    });

    await expect(
      confirmWardPayment(
        { reservationId: RESERVATION_ID, adminId: ADMIN_ALA_ID },
        { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
      )
    ).rejects.toThrow(
      "Não é possível confirmar pagamento para reserva com status 'cancelada_com_credito'."
    );

    expect(mockReservationRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("permite que Admin Estaca confirme pagamento de qualquer Ala da sua Estaca", async () => {
    const adminEstacaProfile: Profile = {
      id: ADMIN_ESTACA_ID,
      stake_id: STAKE_NATAL_ID,
      ward_id: null,
      role: "admin_estaca",
      full_name: "Admin da Estaca Natal",
      cpf: "222.222.222-22",
      birth_date: "1975-05-10",
      phone: "84999991111",
      sexo: "masculino",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    mockProfileRepository.findById.mockResolvedValueOnce(adminEstacaProfile);
    mockReservationRepository.findById.mockResolvedValueOnce(pendingReservation);
    mockReservationRepository.updateStatus.mockResolvedValueOnce({
      ...pendingReservation,
      status: "pago_ala",
    });

    const result = await confirmWardPayment(
      { reservationId: RESERVATION_ID, adminId: ADMIN_ESTACA_ID },
      { reservationRepository: mockReservationRepository, profileRepository: mockProfileRepository }
    );

    expect(result.status).toBe("pago_ala");
    expect(mockReservationRepository.updateStatus).toHaveBeenCalledWith(RESERVATION_ID, {
      status: "pago_ala",
    });
  });
});
