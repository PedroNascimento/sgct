/**
 * Caso de uso: Concessão Excepcional de Crédito para No-Show (Spec 007 / T007.8 / US-007.3 / D03 / D08).
 *
 * Permite ao Admin Ala registrar um crédito manual ('exceptional_grant')
 * para uma reserva que teve 'no_show', exigindo justificativa obrigatória
 * e gravando evento de auditoria em audit_logs.
 */

import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { AuditLogRepository } from "@/domain/interfaces/audit-log-repository";
import type { CreditLedgerEntry } from "@/domain/types/credit";

export interface GrantExceptionalCreditInput {
  reservationId: string;
  grantedBy: string;
  reason: string;
}

export class GrantExceptionalCredit {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly creditRepository: CreditRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async execute(input: GrantExceptionalCreditInput): Promise<CreditLedgerEntry> {
    const { reservationId, grantedBy, reason } = input;

    if (!reason || !reason.trim()) {
      throw new Error("Motivo da concessão excepcional é obrigatório.");
    }

    if (!grantedBy || !grantedBy.trim()) {
      throw new Error("Identificação do administrador é obrigatória.");
    }

    // 1. Obter a reserva de origem
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new Error("Reserva não encontrada.");
    }

    // 2. Validar que o status é 'no_show'
    if (reservation.status !== "no_show") {
      throw new Error(
        "Crédito excepcional só pode ser concedido para reservas com status 'no_show'."
      );
    }

    // 3. Validar que houve pagamento
    if (reservation.payment_amount <= 0) {
      throw new Error(
        "Reserva sem valor financeiro pago para conversão em crédito."
      );
    }

    // 4. Calcular expiração (12 meses conforme D08)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // 5. Criar registro de crédito com source 'exceptional_grant'
    const credit = await this.creditRepository.create({
      stake_id: reservation.stake_id,
      ward_id: reservation.ward_id || undefined,
      user_id: reservation.user_id,
      amount: reservation.payment_amount,
      source: "exceptional_grant",
      origin_reservation_id: reservation.id,
      granted_by: grantedBy,
      reason: reason.trim(),
      status: "active",
      expires_at: expiresAt.toISOString(),
    });

    // 6. Registrar em audit_logs (LGPD / Rastreabilidade administrativa)
    await this.auditLogRepository.log({
      stake_id: reservation.stake_id,
      actor_id: grantedBy,
      action: "GRANT_EXCEPTIONAL_CREDIT",
      entity: "credit_ledger",
      entity_id: credit.id,
      metadata: {
        reservationId: reservation.id,
        amount: reservation.payment_amount,
        reason: reason.trim(),
        userId: reservation.user_id,
      },
    });

    return credit;
  }
}
