/**
 * TDD: Testes para createReservation (T003.2, T003.3, T003.4)
 * RED phase — Artigo IV da Constituição.
 */

import { createReservation } from "./create-reservation";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { Caravan } from "@/domain/types/caravan";
import type { Profile } from "@/domain/types/tenant";
import type { CreateReservationInput } from "@/domain/schemas/reservation";

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

const mockProfileRepository: jest.Mocked<ProfileRepository> = {
  findById: jest.fn(),
  insert: jest.fn(),
  updateRole: jest.fn(),
  deactivateInactive: jest.fn(),
};

describe("createReservation (T003.2, T003.3, T003.4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_NATAL_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_TIROL_ID = "11111111-1111-1111-1111-111111111111";
  const CARAVAN_ID = "22222222-2222-2222-2222-222222222222";
  const USER_ID = "33333333-3333-3333-3333-333333333333";

  const memberProfile: Profile = {
    id: USER_ID,
    stake_id: STAKE_NATAL_ID,
    ward_id: WARD_TIROL_ID,
    role: "member",
    full_name: "Membro da Silva",
    cpf: "123.456.789-00",
    birth_date: "1990-05-10",
    phone: "84999999999",
    sexo: "masculino",
    is_minor: false,
    is_active: true,
    home_stake_name: null,
    home_ward_name: null,
    guardian_id: null,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  const openCaravan: Caravan = {
    id: CARAVAN_ID,
    stake_id: STAKE_NATAL_ID,
    departure_date: "2026-11-20",
    return_date: "2026-11-23",
    price_standard: 130.0,
    price_officiant: 117.0,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-11-15",
    min_quorum: 48,
    quorum_check_date: "2026-11-17",
    status: "open",
    caravan_leader_id: null,
    created_by: "admin-id",
    created_at: new Date().toISOString(),
  };

  const baseInput: CreateReservationInput = {
    caravanId: CARAVAN_ID,
    seatNumber: 15,
    category: "standard",
    participantType: "adulto",
    fundingSource: "membro",
    isPreferentialSeating: false,
  };

  it("cria reserva para membro comum aplicando price_standard e status 'pendente' (T003.2)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce(openCaravan);
    mockReservationRepository.create.mockImplementationOnce(async (data) => ({
      id: "reservation-uuid-1",
      stake_id: STAKE_NATAL_ID,
      ward_id: WARD_TIROL_ID,
      confirmed_at: null,
      confirmation_rank: null,
      qr_token: null,
      qr_token_expires_at: null,
      created_at: new Date().toISOString(),
      boarding_point_id: data.boarding_point_id ?? null,
      family_group_member_names: data.family_group_member_names ?? null,
      family_group_label: data.family_group_label ?? null,
      companion_for_endowment_name: data.companion_for_endowment_name ?? null,
      ...data,
    }));

    const result = await createReservation(baseInput, USER_ID, {
      reservationRepository: mockReservationRepository,
      caravanRepository: mockCaravanRepository,
      profileRepository: mockProfileRepository,
    });

    expect(result.id).toBe("reservation-uuid-1");
    expect(result.status).toBe("pendente");
    expect(result.payment_amount).toBe(130.0);
    expect(result.seat_number).toBe(15);
    expect(mockReservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        caravan_id: CARAVAN_ID,
        user_id: USER_ID,
        seat_number: 15,
        payment_amount: 130.0,
        status: "pendente",
      })
    );
  });

  it("aplica price_officiant diretamente para categoria 'officiant' sem aprovação administrativa (T003.3)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce(openCaravan);
    mockReservationRepository.create.mockImplementationOnce(async (data) => ({
      id: "res-officiant-1",
      stake_id: STAKE_NATAL_ID,
      ward_id: WARD_TIROL_ID,
      confirmed_at: null,
      confirmation_rank: null,
      qr_token: null,
      qr_token_expires_at: null,
      created_at: new Date().toISOString(),
      boarding_point_id: null,
      family_group_member_names: null,
      family_group_label: null,
      companion_for_endowment_name: null,
      ...data,
    }));

    const result = await createReservation(
      { ...baseInput, category: "officiant" },
      USER_ID,
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.payment_amount).toBe(117.0);
    expect(mockReservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_amount: 117.0,
        category: "officiant",
      })
    );
  });

  it("trata erro de concorrência/chave única retornando mensagem limpa de assento ocupado (T003.2)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce(openCaravan);

    // Simula erro de chave única do PostgreSQL (unique violation caravan_id, seat_number)
    const uniqueError = new Error("duplicate key value violates unique constraint 'reservations_caravan_id_seat_number_key'");
    (uniqueError as unknown as { code: string }).code = "23505";
    mockReservationRepository.create.mockRejectedValueOnce(uniqueError);

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Assento já ocupado. Por favor, escolha outro assento.");
  });

  it("define status 'aguardando_auxilio' quando funding_source for auxílio financeiro (US-003.6 / D27)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce(openCaravan);
    mockReservationRepository.create.mockImplementationOnce(async (data) => ({
      id: "res-aid-1",
      stake_id: STAKE_NATAL_ID,
      ward_id: WARD_TIROL_ID,
      confirmed_at: null,
      confirmation_rank: null,
      qr_token: null,
      qr_token_expires_at: null,
      created_at: new Date().toISOString(),
      boarding_point_id: null,
      family_group_member_names: null,
      family_group_label: null,
      companion_for_endowment_name: null,
      ...data,
    }));

    const result = await createReservation(
      { ...baseInput, fundingSource: "auxilio_area_investidura" },
      USER_ID,
      {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      }
    );

    expect(result.status).toBe("aguardando_auxilio");
  });

  it("bloqueia reserva se o perfil do usuário não tiver documento preenchido (US-003.5)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...memberProfile,
      cpf: null, // Perfil incompleto
    });

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Seu perfil está incompleto. Por favor, informe seu documento antes de reservar.");

    expect(mockReservationRepository.create).not.toHaveBeenCalled();
  });

  it("bloqueia reserva se os dados forem inválidos (erro Zod)", async () => {
    await expect(
      createReservation({ ...baseInput, seatNumber: 99 }, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Assento máximo é 50.");
  });

  it("bloqueia se o usuário for inativo ou não encontrado", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce({
      ...memberProfile,
      is_active: false,
    });

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Usuário não encontrado ou inativo.");
  });

  it("bloqueia se tentar reservar assento para tipo crianca (deve ir para manifesto)", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);

    await expect(
      createReservation({ ...baseInput, participantType: "crianca" }, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow(
      "Crianças de colo de 0 a 5 anos não ocupam assento. Cadastre-a no manifesto de passageiros da sua reserva."
    );
  });

  it("bloqueia se a caravana não existir ou não estiver aberta", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce(null);

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Caravana não encontrada.");

    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce({
      ...openCaravan,
      status: "fechada",
    });

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Inscrições para esta caravana não estão abertas.");
  });

  it("bloqueia se a caravana pertencer a outra Estaca e usuário não for guest", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce({
      ...openCaravan,
      stake_id: "outra-estaca-id",
    });

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Esta caravana pertence a outra Estaca.");
  });

  it("repassa erros inesperados que não sejam violação de unicidade", async () => {
    mockProfileRepository.findById.mockResolvedValueOnce(memberProfile);
    mockCaravanRepository.findById.mockResolvedValueOnce(openCaravan);
    mockReservationRepository.create.mockRejectedValueOnce(new Error("Database connection lost"));

    await expect(
      createReservation(baseInput, USER_ID, {
        reservationRepository: mockReservationRepository,
        caravanRepository: mockCaravanRepository,
        profileRepository: mockProfileRepository,
      })
    ).rejects.toThrow("Database connection lost");
  });
});
