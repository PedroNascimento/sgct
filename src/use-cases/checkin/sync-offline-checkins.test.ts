/**
 * Testes unitários para syncOfflineCheckIns (Spec 007 / T007.5 e T007.6).
 * US-007.2: Sincronização offline->online e idempotência por (reservation_id, direction).
 */

import { syncOfflineCheckIns } from "./sync-offline-checkins";
import { signQrToken } from "./qr-token-crypto";
import type { CheckInRepository } from "@/domain/interfaces/checkin-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { CheckIn } from "@/domain/types/checkin";

describe("SyncOfflineCheckIns & Idempotência (T007.5 / T007.6)", () => {
  let mockCheckInRepo: jest.Mocked<CheckInRepository>;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;

  const SECRET = "secret-key-offline-sync-test";

  const RESERVATION_1: Reservation = {
    id: "res-uuid-1",
    stake_id: "stake-uuid-1",
    caravan_id: "caravan-uuid-1",
    user_id: "user-uuid-1",
    ward_id: "ward-uuid-1",
    seat_number: 14,
    boarding_point_id: "bp-1",
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "confirmado",
    payment_amount: 130,
    confirmed_at: "2026-10-15T10:00:00Z",
    confirmation_rank: 1,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-10-01T10:00:00Z",
  };

  const RESERVATION_2: Reservation = {
    ...RESERVATION_1,
    id: "res-uuid-2",
    seat_number: 15,
  };

  beforeEach(() => {
    mockCheckInRepo = {
      createCheckIn: jest.fn(),
      findByReservationAndDirection: jest.fn(),
      listByCaravan: jest.fn(),
      listValidCaravanTokens: jest.fn(),
    };

    mockReservationRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;
  });

  it("deve sincronizar múltiplos check-ins offline com sucesso", async () => {
    const token1 = signQrToken(
      {
        reservationId: "res-uuid-1",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) + 7200,
      },
      SECRET
    );

    const token2 = signQrToken(
      {
        reservationId: "res-uuid-2",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) + 7200,
      },
      SECRET
    );

    mockReservationRepo.findById
      .mockResolvedValueOnce(RESERVATION_1)
      .mockResolvedValueOnce(RESERVATION_2);

    mockCheckInRepo.findByReservationAndDirection.mockResolvedValue(null);

    mockCheckInRepo.createCheckIn.mockImplementation(async (data) => ({
      id: `checkin-${data.reservation_id}`,
      stake_id: "stake-uuid-1",
      ward_id: "ward-uuid-1",
      reservation_id: data.reservation_id,
      direction: data.direction,
      checked_in_by: data.checked_in_by,
      checked_in_at: data.checked_in_at || new Date().toISOString(),
      synced_offline: true,
    }));

    const result = await syncOfflineCheckIns(
      [
        {
          token: token1,
          direction: "ida",
          checkedInBy: "leader-1",
          checkedInAt: "2026-11-20T05:45:00Z",
        },
        {
          token: token2,
          direction: "ida",
          checkedInBy: "leader-1",
          checkedInAt: "2026-11-20T05:46:00Z",
        },
      ],
      {
        checkInRepository: mockCheckInRepo,
        reservationRepository: mockReservationRepo,
        secret: SECRET,
      }
    );

    expect(result.syncedCount).toBe(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(mockCheckInRepo.createCheckIn).toHaveBeenCalledTimes(2);
  });

  it("T007.6: leitura duplicada (offline + online) não gera dois check-ins", async () => {
    const token1 = signQrToken(
      {
        reservationId: "res-uuid-1",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) + 7200,
      },
      SECRET
    );

    // Simula que a reserva 1 já recebeu check-in online
    const alreadySavedCheckIn: CheckIn = {
      id: "checkin-online-ja-existente",
      stake_id: RESERVATION_1.stake_id,
      ward_id: RESERVATION_1.ward_id!,
      reservation_id: RESERVATION_1.id,
      direction: "ida",
      checked_in_by: "leader-1",
      checked_in_at: "2026-11-20T05:30:00Z",
      synced_offline: false,
    };

    mockReservationRepo.findById.mockResolvedValueOnce(RESERVATION_1);
    mockCheckInRepo.findByReservationAndDirection.mockResolvedValueOnce(alreadySavedCheckIn);

    const result = await syncOfflineCheckIns(
      [
        {
          token: token1,
          direction: "ida",
          checkedInBy: "leader-1",
          checkedInAt: "2026-11-20T05:45:00Z",
        },
      ],
      {
        checkInRepository: mockCheckInRepo,
        reservationRepository: mockReservationRepo,
        secret: SECRET,
      }
    );

    expect(result.syncedCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(mockCheckInRepo.createCheckIn).not.toHaveBeenCalled();
  });
});
