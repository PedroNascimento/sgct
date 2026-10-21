/**
 * Testes unitários para ValidateCheckIn (Spec 007 / T007.2).
 * US-007.2: Validação de check-in com assinatura, expiração e idempotência.
 */

import { validateCheckIn } from "./validate-checkin";
import { signQrToken } from "./qr-token-crypto";
import type { CheckInRepository } from "@/domain/interfaces/checkin-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { CheckIn } from "@/domain/types/checkin";

describe("ValidateCheckIn (T007.2)", () => {
  let mockCheckInRepo: jest.Mocked<CheckInRepository>;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;

  const SECRET = "secret-key-para-testes-123456";

  const RESERVATION: Reservation = {
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

  it("deve rejeitar token com assinatura forjada/inválida", async () => {
    const validToken = signQrToken(
      {
        reservationId: "res-uuid-1",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "outra-chave-diferente"
    );

    await expect(
      validateCheckIn(
        {
          token: validToken,
          direction: "ida",
          checkedInBy: "leader-uuid-1",
        },
        {
          checkInRepository: mockCheckInRepo,
          reservationRepository: mockReservationRepo,
          secret: SECRET,
        }
      )
    ).rejects.toThrow(/Assinatura do token inválida/i);

    expect(mockCheckInRepo.createCheckIn).not.toHaveBeenCalled();
  });

  it("deve rejeitar token expirado", async () => {
    const expiredToken = signQrToken(
      {
        reservationId: "res-uuid-1",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) - 60, // expirado há 1 minuto
      },
      SECRET
    );

    await expect(
      validateCheckIn(
        {
          token: expiredToken,
          direction: "ida",
          checkedInBy: "leader-uuid-1",
        },
        {
          checkInRepository: mockCheckInRepo,
          reservationRepository: mockReservationRepo,
          secret: SECRET,
        }
      )
    ).rejects.toThrow(/Token de check-in expirado/i);
  });

  it("deve registrar o check-in com sucesso e atualizar status para 'presente' na ida", async () => {
    const token = signQrToken(
      {
        reservationId: "res-uuid-1",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) + 7200,
      },
      SECRET
    );

    mockReservationRepo.findById.mockResolvedValueOnce(RESERVATION);
    mockCheckInRepo.findByReservationAndDirection.mockResolvedValueOnce(null);

    const createdCheckIn: CheckIn = {
      id: "checkin-uuid-1",
      stake_id: RESERVATION.stake_id,
      ward_id: RESERVATION.ward_id!,
      reservation_id: RESERVATION.id,
      direction: "ida",
      checked_in_by: "leader-uuid-1",
      checked_in_at: new Date().toISOString(),
      synced_offline: false,
    };

    mockCheckInRepo.createCheckIn.mockResolvedValueOnce(createdCheckIn);

    const result = await validateCheckIn(
      {
        token,
        direction: "ida",
        checkedInBy: "leader-uuid-1",
      },
      {
        checkInRepository: mockCheckInRepo,
        reservationRepository: mockReservationRepo,
        secret: SECRET,
      }
    );

    expect(result).toEqual(createdCheckIn);
    expect(mockCheckInRepo.createCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        reservation_id: RESERVATION.id,
        direction: "ida",
        checked_in_by: "leader-uuid-1",
      })
    );
    expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith(
      RESERVATION.id,
      { status: "presente" }
    );
  });

  it("deve ser idempotente caso o check-in já exista para a mesma direção", async () => {
    const token = signQrToken(
      {
        reservationId: "res-uuid-1",
        caravanId: "caravan-uuid-1",
        stakeId: "stake-uuid-1",
        exp: Math.floor(Date.now() / 1000) + 7200,
      },
      SECRET
    );

    const existingCheckIn: CheckIn = {
      id: "checkin-uuid-existente",
      stake_id: RESERVATION.stake_id,
      ward_id: RESERVATION.ward_id!,
      reservation_id: RESERVATION.id,
      direction: "ida",
      checked_in_by: "leader-uuid-1",
      checked_in_at: "2026-11-20T06:10:00Z",
      synced_offline: false,
    };

    mockReservationRepo.findById.mockResolvedValueOnce(RESERVATION);
    mockCheckInRepo.findByReservationAndDirection.mockResolvedValueOnce(existingCheckIn);

    const result = await validateCheckIn(
      {
        token,
        direction: "ida",
        checkedInBy: "leader-uuid-1",
      },
      {
        checkInRepository: mockCheckInRepo,
        reservationRepository: mockReservationRepo,
        secret: SECRET,
      }
    );

    expect(result).toEqual(existingCheckIn);
    // Não deve tentar recriar no banco
    expect(mockCheckInRepo.createCheckIn).not.toHaveBeenCalled();
  });
});
