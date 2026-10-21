import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { GrantExceptionalCredit } from "./grant-exceptional-credit";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { AuditLogRepository } from "@/domain/interfaces/audit-log-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";

describe("GrantExceptionalCredit (T007.8 / US-007.3 / D03)", () => {
  let grantExceptionalCredit: GrantExceptionalCredit;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;
  let mockCreditRepo: jest.Mocked<CreditRepository>;
  let mockAuditLogRepo: jest.Mocked<AuditLogRepository>;

  const reservationId = "res-no-show-1";
  const grantedBy = "admin-ala-uuid";
  const reason = "Membro teve emergência médica comprovada por atestado.";

  const noShowReservation: Reservation = {
    id: reservationId,
    stake_id: "stake-1",
    ward_id: "ward-1",
    user_id: "user-1",
    caravan_id: "caravan-1",
    seat_number: 12,
    boarding_point_id: null,
    category: "standard",
    participant_type: "adulto",
    funding_source: "membro",
    is_preferential_seating: false,
    family_group_member_names: null,
    family_group_label: null,
    companion_for_endowment_name: null,
    status: "no_show",
    payment_amount: 150,
    confirmed_at: "2026-10-10T12:00:00Z",
    confirmation_rank: 1,
    qr_token: "token-1",
    qr_token_expires_at: "2026-10-20T12:00:00Z",
    created_at: "2026-10-01T10:00:00Z",
  };

  beforeEach(() => {
    mockReservationRepo = {
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
      updateQrToken: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;

    mockCreditRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      findExpiredActive: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<CreditRepository>;

    mockAuditLogRepo = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditLogRepository>;

    grantExceptionalCredit = new GrantExceptionalCredit(
      mockReservationRepo,
      mockCreditRepo,
      mockAuditLogRepo
    );
  });

  it("deve conceder crédito excepcional com sucesso e registrar audit log", async () => {
    mockReservationRepo.findById.mockResolvedValue(noShowReservation);

    const mockCreditEntry: CreditLedgerEntry = {
      id: "credit-entry-1",
      stake_id: "stake-1",
      ward_id: "ward-1",
      user_id: "user-1",
      amount: 150,
      source: "exceptional_grant",
      origin_reservation_id: reservationId,
      granted_by: grantedBy,
      reason,
      status: "active",
      expires_at: "2027-10-20T20:00:00.000Z",
      used_at: null,
      created_at: "2026-10-20T20:00:00.000Z",
    };

    mockCreditRepo.create.mockResolvedValue(mockCreditEntry);
    mockAuditLogRepo.log.mockResolvedValue();

    const result = await grantExceptionalCredit.execute({
      reservationId,
      grantedBy,
      reason,
    });

    expect(result).toEqual(mockCreditEntry);

    // Verifica que o crédito foi criado com source 'exceptional_grant'
    expect(mockCreditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        stake_id: "stake-1",
        ward_id: "ward-1",
        amount: 150,
        source: "exceptional_grant",
        origin_reservation_id: reservationId,
        granted_by: grantedBy,
        reason,
        status: "active",
      })
    );

    // Verifica que audit_logs foi gravado
    expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        stake_id: "stake-1",
        actor_id: grantedBy,
        action: "GRANT_EXCEPTIONAL_CREDIT",
        entity: "credit_ledger",
        entity_id: "credit-entry-1",
        metadata: expect.objectContaining({
          reservationId,
          amount: 150,
          reason,
          userId: "user-1",
        }),
      })
    );
  });

  it("deve rejeitar se o motivo (reason) não for informado ou for apenas espaços", async () => {
    await expect(
      grantExceptionalCredit.execute({
        reservationId,
        grantedBy,
        reason: "   ",
      })
    ).rejects.toThrow("Motivo da concessão excepcional é obrigatório.");

    expect(mockCreditRepo.create).not.toHaveBeenCalled();
    expect(mockAuditLogRepo.log).not.toHaveBeenCalled();
  });

  it("deve rejeitar se o responsável (grantedBy) não for informado", async () => {
    await expect(
      grantExceptionalCredit.execute({
        reservationId,
        grantedBy: "",
        reason,
      })
    ).rejects.toThrow("Identificação do administrador é obrigatória.");

    expect(mockCreditRepo.create).not.toHaveBeenCalled();
  });

  it("deve rejeitar se a reserva não for encontrada", async () => {
    mockReservationRepo.findById.mockResolvedValue(null);

    await expect(
      grantExceptionalCredit.execute({
        reservationId: "res-inexistente",
        grantedBy,
        reason,
      })
    ).rejects.toThrow("Reserva não encontrada.");

    expect(mockCreditRepo.create).not.toHaveBeenCalled();
  });

  it("deve rejeitar se a reserva não estiver com status 'no_show'", async () => {
    mockReservationRepo.findById.mockResolvedValue({
      ...noShowReservation,
      status: "confirmado",
    });

    await expect(
      grantExceptionalCredit.execute({
        reservationId,
        grantedBy,
        reason,
      })
    ).rejects.toThrow(
      "Crédito excepcional só pode ser concedido para reservas com status 'no_show'."
    );

    expect(mockCreditRepo.create).not.toHaveBeenCalled();
  });

  it("deve rejeitar se a reserva não tiver valor pago", async () => {
    mockReservationRepo.findById.mockResolvedValue({
      ...noShowReservation,
      payment_amount: 0,
    });

    await expect(
      grantExceptionalCredit.execute({
        reservationId,
        grantedBy,
        reason,
      })
    ).rejects.toThrow("Reserva sem valor financeiro pago para conversão em crédito.");

    expect(mockCreditRepo.create).not.toHaveBeenCalled();
  });
});
