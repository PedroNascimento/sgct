import { listOwnReservations } from "./list-own-reservations";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Caravan } from "@/domain/types/caravan";

const reservationRepository: jest.Mocked<ReservationRepository> = {
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

const caravanRepository: jest.Mocked<CaravanRepository> = {
  findById: jest.fn(),
  findByStakeId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  addBoardingPoint: jest.fn(),
  getBoardingPointsByCaravanId: jest.fn(),
  findPublicSummariesByStakeId: jest.fn(),
};

const USER_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "10000000-0000-4000-8000-000000000002";
const STAKE_ID = "20000000-0000-4000-8000-000000000001";
const OTHER_STAKE_ID = "20000000-0000-4000-8000-000000000002";
const CARAVAN_ID = "30000000-0000-4000-8000-000000000001";

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "40000000-0000-4000-8000-000000000001",
    stake_id: STAKE_ID,
    caravan_id: CARAVAN_ID,
    user_id: USER_ID,
    ward_id: "50000000-0000-4000-8000-000000000001",
    seat_number: 12,
    boarding_point_id: "60000000-0000-4000-8000-000000000001",
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "pago_ala",
    payment_amount: 130,
    confirmed_at: null,
    confirmation_rank: null,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-09-28T12:00:00Z",
    ...overrides,
  };
}

const caravan: Caravan = {
  id: CARAVAN_ID,
  stake_id: STAKE_ID,
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
  created_by: "70000000-0000-4000-8000-000000000001",
  created_at: "2026-09-01T12:00:00Z",
  boarding_points: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      caravan_id: CARAVAN_ID,
      stake_id: STAKE_ID,
      name: "Capela Tirol",
      boarding_time: "2026-11-20T23:00:00Z",
    },
  ],
};

describe("listOwnReservations (US-004.5)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("compõe somente reservas do usuário e da Estaca informados", async () => {
    reservationRepository.findByUserId.mockResolvedValue([
      reservation(),
      reservation({ id: "cross-user", user_id: OTHER_USER_ID }),
      reservation({ id: "cross-stake", stake_id: OTHER_STAKE_ID }),
    ]);
    caravanRepository.findById.mockResolvedValue(caravan);

    const result = await listOwnReservations(USER_ID, STAKE_ID, {
      reservationRepository,
      caravanRepository,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        reservation: expect.objectContaining({ id: "40000000-0000-4000-8000-000000000001" }),
        caravan,
        boardingPoint: caravan.boarding_points?.[0],
      })
    );
    expect(caravanRepository.findById).toHaveBeenCalledTimes(1);
  });

  it("descarta caravana ausente ou pertencente a outra Estaca", async () => {
    reservationRepository.findByUserId.mockResolvedValue([
      reservation(),
      reservation({ id: "missing-caravan", caravan_id: "30000000-0000-4000-8000-000000000009" }),
    ]);
    caravanRepository.findById
      .mockResolvedValueOnce({ ...caravan, stake_id: OTHER_STAKE_ID })
      .mockResolvedValueOnce(null);

    const result = await listOwnReservations(USER_ID, STAKE_ID, {
      reservationRepository,
      caravanRepository,
    });

    expect(result).toEqual([]);
  });

  it("rejeita identificadores inválidos antes de consultar os repositórios", async () => {
    await expect(
      listOwnReservations("usuario-invalido", STAKE_ID, {
        reservationRepository,
        caravanRepository,
      })
    ).rejects.toThrow("ID do usuário inválido.");

    expect(reservationRepository.findByUserId).not.toHaveBeenCalled();
  });

  it("rejeita ID de Estaca inválido antes de consultar os repositórios", async () => {
    await expect(
      listOwnReservations(USER_ID, "estaca-invalida", {
        reservationRepository,
        caravanRepository,
      })
    ).rejects.toThrow("ID da Estaca inválido.");

    expect(reservationRepository.findByUserId).not.toHaveBeenCalled();
  });

  it("retorna embarque nulo quando a reserva não aponta para um ponto válido", async () => {
    reservationRepository.findByUserId.mockResolvedValue([
      reservation({ boarding_point_id: "60000000-0000-4000-8000-000000000009" }),
    ]);
    caravanRepository.findById.mockResolvedValue(caravan);

    const result = await listOwnReservations(USER_ID, STAKE_ID, {
      reservationRepository,
      caravanRepository,
    });

    expect(result[0].boardingPoint).toBeNull();
  });
});
