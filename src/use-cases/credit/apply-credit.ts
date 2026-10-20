/**
 * Use-case: Aplicar Crédito a uma Nova Reserva (Spec 005 / US-005.3).
 *
 * Regras:
 * - Valida se o crédito pertence ao mesmo membro.
 * - Rejeita se o crédito já estiver 'expired' ou se atingiu a data de expiração.
 * - Rejeita se o crédito já foi 'used'.
 * - Abate o valor do crédito da reserva. Se zerar, move status para 'pago_ala'.
 * - Atualiza status do crédito para 'used'.
 */

import { applyCreditSchema, type ApplyCreditInput } from "@/domain/schemas/credit";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CreditLedgerEntry } from "@/domain/types/credit";
import type { Reservation } from "@/domain/types/reservation";

export interface ApplyCreditDependencies {
  creditRepository: CreditRepository;
  reservationRepository: ReservationRepository;
}

export interface ApplyCreditResult {
  credit: CreditLedgerEntry;
  reservation: Reservation;
}

export async function applyCredit(
  input: ApplyCreditInput,
  deps: ApplyCreditDependencies
): Promise<ApplyCreditResult> {
  const { creditRepository, reservationRepository } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = applyCreditSchema.parse(input);

  // 2. Busca do crédito
  const credit = await creditRepository.findById(validated.creditId);
  if (!credit) {
    throw new Error("Crédito não encontrado.");
  }

  // 3. Verificação de titularidade
  if (credit.user_id !== validated.userId) {
    throw new Error("Você não tem permissão para utilizar este crédito.");
  }

  // 4. Verificação de expiração (US-005.3)
  if (credit.status === "expired") {
    throw new Error("Crédito já expirado não pode ser aplicado a uma nova reserva.");
  }

  const now = validated.currentDate ? new Date(validated.currentDate) : new Date();
  if (new Date(credit.expires_at).getTime() <= now.getTime()) {
    throw new Error("Crédito expirado não pode ser aplicado a uma nova reserva.");
  }

  if (credit.status === "used") {
    throw new Error("Este crédito já foi utilizado.");
  }

  // 5. Busca da reserva
  const reservation = await reservationRepository.findById(validated.reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada.");
  }

  if (reservation.user_id !== validated.userId) {
    throw new Error("Reserva pertence a outro usuário.");
  }

  if (reservation.status !== "pendente") {
    throw new Error(`Não é possível aplicar crédito a uma reserva com status '${reservation.status}'.`);
  }

  // 6. Abatimento do valor
  const currentAmount = reservation.payment_amount;
  const newAmount = Math.max(0, currentAmount - credit.amount);
  const newStatus = newAmount === 0 ? "pago_ala" : "pendente";

  // 7. Atualização atômica do crédito e da reserva
  const usedAt = now.toISOString();
  const updatedCredit = await creditRepository.updateStatus(credit.id, "used", usedAt);

  const updatedReservation = await reservationRepository.updateStatus(reservation.id, {
    status: newStatus,
  });

  return {
    credit: updatedCredit,
    reservation: {
      ...updatedReservation,
      payment_amount: newAmount,
    },
  };
}
