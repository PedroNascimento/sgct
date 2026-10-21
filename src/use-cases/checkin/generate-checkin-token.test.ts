/**
 * Testes unitários para GenerateCheckInToken (Spec 007 / T007.1).
 * US-007.1: Geração de QR Code apenas para reservas confirmadas.
 */

import { generateCheckInToken } from "./generate-checkin-token";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { Caravan } from "@/domain/types/caravan";

describe("GenerateCheckInToken (T007.1)", () => {
  let mockReservationRepo: jest.Mocked<ReservationRepository>;
  let mockCaravanRepo: jest.Mocked<CaravanRepository>;

  const CONFIRMED_RESERVATION: Reservation = {
    id: "res-uuid-1",
    stake_id: "stake-uuid-1",
    caravan_id: "caravan-uuid-1",
    user_id: "user-uuid-1",
    ward_id: "ward-uuid-1",
    seat_number: 12,
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

  const CARAVAN: Caravan = {
    id: "caravan-uuid-1",
    stake_id: "stake-uuid-1",
    departure_date: "2026-11-20",
    return_date: "2026-11-22",
    price_standard: 130,
    price_officiant: 90,
    seat_limit: 50,
    waitlist_limit: 5,
    registration_deadline: "2026-11-15",
    min_quorum: 48,
    quorum_check_date: "2026-11-17",
    status: "confirmed",
    caravan_leader_id: null,
    created_by: "admin-1",
    created_at: "2026-10-01T00:00:00Z",
  };

  beforeEach(() => {
    mockReservationRepo = {
      findById: jest.fn(),
      updateQrToken: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;

    mockCaravanRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CaravanRepository>;
  });

  it("deve rejeitar se a reserva não existir", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(null);

    await expect(
      generateCheckInToken("res-inexistente", {
        reservationRepository: mockReservationRepo,
        caravanRepository: mockCaravanRepo,
        secret: "super-secret-key-123",
      })
    ).rejects.toThrow("Reserva não encontrada");
  });

  it("deve rejeitar se a reserva NÃO estiver no status confirmado", async () => {
    const pendingReservation = { ...CONFIRMED_RESERVATION, status: "pago_ala" as any };
    mockReservationRepo.findById.mockResolvedValueOnce(pendingReservation);

    await expect(
      generateCheckInToken(pendingReservation.id, {
        reservationRepository: mockReservationRepo,
        caravanRepository: mockCaravanRepo,
        secret: "super-secret-key-123",
      })
    ).rejects.toThrow("Token de check-in só pode ser gerado para reservas confirmadas");

    expect(mockReservationRepo.updateQrToken).not.toHaveBeenCalled();
  });

  it("deve gerar token assinado, salvar no banco e retornar token e validade", async () => {
    mockReservationRepo.findById.mockResolvedValueOnce(CONFIRMED_RESERVATION);
    mockCaravanRepo.findById.mockResolvedValueOnce(CARAVAN);
    mockReservationRepo.updateQrToken.mockImplementation(async (id, token, expiresAt) => ({
      ...CONFIRMED_RESERVATION,
      qr_token: token,
      qr_token_expires_at: expiresAt,
    }));

    const result = await generateCheckInToken(CONFIRMED_RESERVATION.id, {
      reservationRepository: mockReservationRepo,
      caravanRepository: mockCaravanRepo,
      secret: "super-secret-key-123",
    });

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.token.split(".").length).toBe(3); // JWT format: header.payload.signature
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(mockReservationRepo.updateQrToken).toHaveBeenCalledWith(
      CONFIRMED_RESERVATION.id,
      result.token,
      result.expiresAt.toISOString()
    );
  });
});
