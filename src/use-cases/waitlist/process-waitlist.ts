/**
 * Use-case: Processamento da Lista de Espera (Spec 005 / US-005.1 e US-005.2).
 *
 * Regras:
 * - T005.1: Se houver alguém na lista de espera, promove a reserva mais antiga para o assento desocupado
 *   e gera crédito de 12 meses para o membro que saiu.
 * - T005.1 / T005.2: A promoção e a criação de crédito ocorrem na mesma transação atômica (rollback em falha).
 * - T005.5: Se não houver lista de espera, a reserva transiciona para 'cancelada_sem_credito' (valor perdido).
 */

import { processWaitlistSchema, type ProcessWaitlistInput } from "@/domain/schemas/waitlist";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { WaitlistTransactionPort } from "@/domain/interfaces/waitlist-transaction-port";
import type { Reservation } from "@/domain/types/reservation";
import type { CreditLedgerEntry } from "@/domain/types/credit";

export interface ProcessWaitlistDependencies {
  reservationRepository: ReservationRepository;
  transactionPort: WaitlistTransactionPort;
}

export interface ProcessWaitlistResult {
  promoted?: Reservation;
  credit?: CreditLedgerEntry;
  vacated?: Reservation;
}

export async function processWaitlist(
  input: ProcessWaitlistInput,
  deps: ProcessWaitlistDependencies
): Promise<ProcessWaitlistResult> {
  const { reservationRepository, transactionPort } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = processWaitlistSchema.parse(input);

  // 2. Busca da reserva que desocupou a vaga
  const vacatedReservation = await reservationRepository.findById(validated.vacatedReservationId);
  if (!vacatedReservation) {
    throw new Error("Reserva desocupada não encontrada.");
  }

  if (vacatedReservation.caravan_id !== validated.caravanId) {
    throw new Error("Reserva não pertence à caravana indicada.");
  }

  // 3. Busca das reservas na lista de espera para esta caravana
  const waitlistReservations = await reservationRepository.findByCaravanAndStatuses(
    validated.caravanId,
    ["lista_espera"]
  );

  // Se não houver ninguém na lista de espera -> Regra de valor perdido (US-005.2 / T005.5)
  if (waitlistReservations.length === 0) {
    const updatedVacated = await reservationRepository.updateStatus(vacatedReservation.id, {
      status: "cancelada_sem_credito",
    });

    return {
      promoted: undefined,
      credit: undefined,
      vacated: updatedVacated,
    };
  }

  // 4. Ordena para encontrar o primeiro da fila (mais antigo)
  const sortedWaitlist = [...waitlistReservations].sort((a, b) => {
    // Se ambos tiverem rank de confirmação definido
    if (a.confirmation_rank != null && b.confirmation_rank != null) {
      return a.confirmation_rank - b.confirmation_rank;
    }
    if (a.confirmation_rank != null) return -1;
    if (b.confirmation_rank != null) return 1;

    // Critério de desempate / ordem padrão: data de criação ASC
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const nextCandidate = sortedWaitlist[0];

  // 5. Cálculo da data de expiração do crédito (12 meses exatos - US-005.1 / D08)
  const baseDate = validated.currentDate ? new Date(validated.currentDate) : new Date();
  const expiresAt = new Date(baseDate.getTime());
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  // 6. Execução atômica (mesma transação no banco - T005.1 / T005.2)
  const transactionResult = await transactionPort.executeAtomicPromotion({
    vacatedReservationId: vacatedReservation.id,
    promotedReservationId: nextCandidate.id,
    assignedSeatNumber: vacatedReservation.seat_number,
    creditData: {
      user_id: vacatedReservation.user_id,
      amount: vacatedReservation.payment_amount,
      source: "waitlist_promotion",
      origin_reservation_id: vacatedReservation.id,
      reason: "Promoção da fila de espera",
      expires_at: expiresAt.toISOString(),
      status: "active",
    },
  });

  return {
    promoted: transactionResult.promoted,
    credit: transactionResult.credit,
    vacated: transactionResult.vacated,
  };
}
