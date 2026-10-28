/**
 * Testes para applyCredit (Spec 005 / US-005.3).
 *
 * Regras:
 * - Aplica crédito ativo a uma reserva pendente do mesmo membro.
 * - IF um crédito já expirado for aplicado a uma nova reserva, THE SYSTEM SHALL rejeitar o uso.
 * - Rejeita se o crédito já foi usado ou pertencer a outro membro.
 */

import { applyCredit } from "./apply-credit";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CreditLedgerEntry } from "@/domain/types/credit";
import type { Reservation } from "@/domain/types/reservation";

const mockCreditRepository: jest.Mocked<CreditRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findActiveByUserId: jest.fn(),
  findExpiredActive: jest.fn(),
  updateStatus: jest.fn(),
};

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

describe("applyCredit (US-005.3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const STAKE_ID = "00000000-0000-0000-0000-000000000001";
  const WARD_ID = "11111111-1111-1111-1111-111111111111";
  const USER_ID = "22222222-2222-2222-2222-222222222222";
  const CREDIT_ID = "33333333-3333-3333-3333-333333333333";
  const RESERVATION_ID = "44444444-4444-4444-4444-444444444444";

  const activeCredit: CreditLedgerEntry = {
    id: CREDIT_ID,
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    user_id: USER_ID,
    amount: 130,
    source: "waitlist_promotion",
    origin_reservation_id: null,
    granted_by: null,
    reason: null,
    expires_at: "2027-08-01T00:00:00.000Z",
    used_at: null,
    status: "active",
    created_at: "2026-08-01T00:00:00.000Z",
  };

  const pendingReservation: Reservation = {
    id: RESERVATION_ID,
    stake_id: STAKE_ID,
    caravan_id: "55555555-5555-5555-5555-555555555555",
    user_id: USER_ID,
    ward_id: WARD_ID,
    seat_number: 15,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "pendente",
    payment_amount: 130,
    confirmed_at: null,
    confirmation_rank: null,
    qr_token: null,
    qr_token_expires_at: null,
    created_at: "2026-09-01T00:00:00.000Z",
  };

  it("aplica crédito ativo com sucesso para abater o valor da reserva", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce(activeCredit);
    mockReservationRepository.findById.mockResolvedValueOnce(pendingReservation);

    const updatedCredit: CreditLedgerEntry = {
      ...activeCredit,
      status: "used",
      used_at: "2026-09-02T10:00:00.000Z",
    };
    mockCreditRepository.updateStatus.mockResolvedValueOnce(updatedCredit);

    const updatedReservation: Reservation = {
      ...pendingReservation,
      payment_amount: 0,
      status: "pago_ala", // Integralmente quitado por crédito
    };
    mockReservationRepository.updateStatus.mockResolvedValueOnce(updatedReservation);

    const result = await applyCredit(
      {
        creditId: CREDIT_ID,
        reservationId: RESERVATION_ID,
        userId: USER_ID,
        currentDate: "2026-09-02T10:00:00.000Z",
      },
      {
        creditRepository: mockCreditRepository,
        reservationRepository: mockReservationRepository,
      }
    );

    expect(mockCreditRepository.updateStatus).toHaveBeenCalledWith(
      CREDIT_ID,
      "used",
      "2026-09-02T10:00:00.000Z"
    );
    expect(result.credit.status).toBe("used");
    expect(result.reservation.payment_amount).toBe(0);
  });

  it("rejeita uso de crédito com status expired", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce({
      ...activeCredit,
      status: "expired",
    });

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Crédito já expirado não pode ser aplicado a uma nova reserva.");
  });

  it("rejeita uso de crédito cuja data de expiração já passou mesmo se status ainda for active", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce({
      ...activeCredit,
      expires_at: "2026-05-01T00:00:00.000Z",
    });

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
          currentDate: "2026-09-01T00:00:00.000Z",
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Crédito expirado não pode ser aplicado a uma nova reserva.");
  });

  it("rejeita se o crédito pertencer a outro membro", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce({
      ...activeCredit,
      user_id: "99999999-9999-9999-9999-999999999999",
    });

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Você não tem permissão para utilizar este crédito.");
  });

  it("abate parcialmente quando o crédito for menor que o valor total da reserva", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce({
      ...activeCredit,
      amount: 50,
    });
    mockReservationRepository.findById.mockResolvedValueOnce(pendingReservation);

    mockCreditRepository.updateStatus.mockResolvedValueOnce({
      ...activeCredit,
      amount: 50,
      status: "used",
    });

    mockReservationRepository.updateStatus.mockResolvedValueOnce({
      ...pendingReservation,
      payment_amount: 80,
      status: "pendente",
    });

    const result = await applyCredit(
      {
        creditId: CREDIT_ID,
        reservationId: RESERVATION_ID,
        userId: USER_ID,
      },
      {
        creditRepository: mockCreditRepository,
        reservationRepository: mockReservationRepository,
      }
    );

    expect(result.reservation.payment_amount).toBe(80);
    expect(mockReservationRepository.updateStatus).toHaveBeenCalledWith(RESERVATION_ID, {
      status: "pendente",
      payment_amount: 80,
    });
  });

  it("rejeita se o crédito não for encontrado", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce(null);

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Crédito não encontrado.");
  });

  it("rejeita se a reserva não for encontrada", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce(activeCredit);
    mockReservationRepository.findById.mockResolvedValueOnce(null);

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Reserva não encontrada.");
  });

  it("rejeita se o crédito já tiver sido utilizado", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce({
      ...activeCredit,
      status: "used",
    });

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Este crédito já foi utilizado.");
  });

  it("rejeita se a reserva não estiver em status pendente", async () => {
    mockCreditRepository.findById.mockResolvedValueOnce(activeCredit);
    mockReservationRepository.findById.mockResolvedValueOnce({
      ...pendingReservation,
      status: "confirmado",
    });

    await expect(
      applyCredit(
        {
          creditId: CREDIT_ID,
          reservationId: RESERVATION_ID,
          userId: USER_ID,
        },
        {
          creditRepository: mockCreditRepository,
          reservationRepository: mockReservationRepository,
        }
      )
    ).rejects.toThrow("Não é possível aplicar crédito a uma reserva com status 'confirmado'.");
  });
});
