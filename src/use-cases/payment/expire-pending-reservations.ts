/**
 * Use-case: Expiração de Reservas Pendentes (Spec 004 / US-004.4 / D01).
 *
 * Regras:
 * - Acionado diariamente via job pg_cron (T004.8).
 * - Transiciona reservas 'pendente' a <= 7 dias do embarque para 'expirada'.
 * - Reservas 'pago_ala' e 'confirmado' NUNCA expiram (US-004.4).
 * - Reservas 'aguardando_auxilio' (spec 012) e 'aguardando_transferencia_interestaca' (spec 013)
 *   NUNCA expiram pelo timeout padrão de 7 dias (US-004.4).
 */

import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";

export interface ExpirePendingReservationsInput {
  referenceDate?: string;
  daysBeforeDeparture?: number;
}

export interface ExpirePendingReservationsResult {
  expiredCount: number;
  expiredReservationIds: string[];
}

export interface ExpirePendingReservationsDependencies {
  reservationRepository: ReservationRepository;
}

export async function expirePendingReservations(
  input: ExpirePendingReservationsInput = {},
  deps: ExpirePendingReservationsDependencies
): Promise<ExpirePendingReservationsResult> {
  const { reservationRepository } = deps;
  const referenceDate = input.referenceDate ?? new Date().toISOString();
  const daysBeforeDeparture = input.daysBeforeDeparture ?? 7;

  // 1. Busca reservas pendentes que ultrapassaram o prazo-limite de pagamento
  const expiredCandidates = await reservationRepository.findPendingExpired(
    referenceDate,
    daysBeforeDeparture
  );

  if (expiredCandidates.length === 0) {
    return {
      expiredCount: 0,
      expiredReservationIds: [],
    };
  }

  // 2. Transiciona status para 'expirada'
  const updates = expiredCandidates.map((r) => ({
    id: r.id,
    status: "expirada" as const,
  }));

  await reservationRepository.updateBatch(updates);

  return {
    expiredCount: updates.length,
    expiredReservationIds: updates.map((u) => u.id),
  };
}
