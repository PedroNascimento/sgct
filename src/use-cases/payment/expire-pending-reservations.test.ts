/**
 * Testes para expirePendingReservations (T004.7)
 *
 * Regras:
 * - Expira reservas 'pendente' a <= 7 dias do embarque (US-004.4 / D01).
 * - Reservas 'pago_ala' e 'confirmado' NUNCA expiram (US-004.4).
 * - Reservas 'aguardando_auxilio' e 'aguardando_transferencia_interestaca' NUNCA expiram pelo timeout de 7 dias (US-004.4 / D27 / D28).
 * - Reservas com mais de 7 dias de antecedência continuam válidas (D17).
 */

import { expirePendingReservations } from "./expire-pending-reservations";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { Reservation } from "@/domain/types/reservation";

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

describe("expirePendingReservations (T004.7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const pendingReservationNearDeparture: Reservation = {
    id: "res-pending-near",
    stake_id: "stake-1",
    caravan_id: "caravan-1",
    user_id: "user-1",
    ward_id: "ward-1",
    seat_number: 5,
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
    created_at: "2026-10-01T10:00:00Z",
  };

  it("transiciona reservas 'pendente' a <= 7 dias do embarque para 'expirada'", async () => {
    mockReservationRepository.findPendingExpired.mockResolvedValueOnce([
      pendingReservationNearDeparture,
    ]);
    mockReservationRepository.updateBatch.mockResolvedValueOnce([
      {
        ...pendingReservationNearDeparture,
        status: "expirada",
      },
    ]);

    const result = await expirePendingReservations(
      {
        referenceDate: "2026-11-15T00:00:00Z",
        daysBeforeDeparture: 7,
      },
      {
        reservationRepository: mockReservationRepository,
      }
    );

    expect(result.expiredCount).toBe(1);
    expect(result.expiredReservationIds).toEqual(["res-pending-near"]);
    expect(mockReservationRepository.updateBatch).toHaveBeenCalledWith([
      {
        id: "res-pending-near",
        status: "expirada",
      },
    ]);
  });

  it("não expira nenhuma reserva se a lista estiver vazia (ex: todas com >7 dias ou pagas)", async () => {
    mockReservationRepository.findPendingExpired.mockResolvedValueOnce([]);

    const result = await expirePendingReservations(
      {
        referenceDate: "2026-11-01T00:00:00Z",
        daysBeforeDeparture: 7,
      },
      {
        reservationRepository: mockReservationRepository,
      }
    );

    expect(result.expiredCount).toBe(0);
    expect(result.expiredReservationIds).toEqual([]);
    expect(mockReservationRepository.updateBatch).not.toHaveBeenCalled();
  });
});
