/**
 * Use-case: Recálculo Automático de Posição na Lista da Caravana (Spec 004 / US-004.3).
 *
 * Regras:
 * - Ordenação:
 *   1. Membros da Estaca anfitriã SEMPRE antes de Convidados Inter-Estaca (D28).
 *   2. Data de confirmação ('confirmed_at') ascendente — quem pagou/confirmou primeiro tem prioridade (D17).
 *   3. Desempate por data de criação ('created_at') ascendente.
 * - Atribuição de Vagas:
 *   - As primeiras `seat_limit` (50) vagas recebem status = 'confirmado' e confirmation_rank = 1..50.
 *   - O excedente recebe status = 'lista_espera' e confirmation_rank = 51..
 * - Evento de Mudança de Posição:
 *   - Dispara PositionChangeEvent quando uma reserva muda de 'confirmado' para 'lista_espera' ou vice-versa (T004.9).
 */

import { z } from "zod";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { Reservation, ReservationStatus } from "@/domain/types/reservation";
import type { PositionChangeEvent } from "@/domain/events/position-change";

export type { PositionChangeEvent };

export interface RecalculateCaravanRankingResult {
  confirmed: Reservation[];
  waitlisted: Reservation[];
  positionChangeEvents: PositionChangeEvent[];
}

export interface RecalculateCaravanRankingDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
}

const caravanIdSchema = z.string().uuid("ID da caravana inválido.");

export async function recalculateCaravanRanking(
  caravanId: string,
  deps: RecalculateCaravanRankingDependencies
): Promise<RecalculateCaravanRankingResult> {
  const validCaravanId = caravanIdSchema.parse(caravanId);
  const { reservationRepository, caravanRepository } = deps;

  // 1. Busca a caravana para obter limites
  const caravan = await caravanRepository.findById(validCaravanId);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  const seatLimit = caravan.seat_limit || 50;

  // 2. Busca todas as reservas confirmadas, pagas na ala ou em lista de espera
  const competingReservations = await reservationRepository.findByCaravanAndStatuses(
    validCaravanId,
    ["confirmado", "pago_ala", "lista_espera"]
  );

  if (competingReservations.length === 0) {
    return {
      confirmed: [],
      waitlisted: [],
      positionChangeEvents: [],
    };
  }

  // 3. Ordenação rigorosa (D28 e D17):
  //    (a) Membros da Estaca anfitriã antes de convidados inter-estaca
  //    (b) confirmed_at ascendente
  //    (c) created_at ascendente (desempate)
  const sorted = [...competingReservations].sort((a, b) => {
    const aIsGuest = a.funding_source === "convidado_transferencia_interestaca";
    const bIsGuest = b.funding_source === "convidado_transferencia_interestaca";

    if (aIsGuest !== bIsGuest) {
      return aIsGuest ? 1 : -1;
    }

    const aTime = a.confirmed_at
      ? new Date(a.confirmed_at).getTime()
      : new Date(a.created_at).getTime();
    const bTime = b.confirmed_at
      ? new Date(b.confirmed_at).getTime()
      : new Date(b.created_at).getTime();

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // 4. Determina status e ranks
  const updates: Array<{
    id: string;
    status: ReservationStatus;
    confirmation_rank: number;
    confirmed_at?: string | null;
  }> = [];

  const positionChangeEvents: PositionChangeEvent[] = [];

  sorted.forEach((reservation, index) => {
    const rank = index + 1;
    const isWithinCapacity = rank <= seatLimit;
    const newStatus: ReservationStatus = isWithinCapacity ? "confirmado" : "lista_espera";

    // Se houve mudança de status entre 'confirmado' e 'lista_espera', gera evento (T004.9)
    if (reservation.status !== newStatus && (reservation.status === "confirmado" || reservation.status === "lista_espera")) {
      positionChangeEvents.push({
        reservationId: reservation.id,
        userId: reservation.user_id,
        caravanId: reservation.caravan_id,
        previousStatus: reservation.status,
        newStatus,
        previousRank: reservation.confirmation_rank,
        newRank: rank,
        reason: isWithinCapacity
          ? "confirmed_within_capacity"
          : "exceeded_capacity_waitlisted",
        timestamp: new Date().toISOString(),
      });
    }

    updates.push({
      id: reservation.id,
      status: newStatus,
      confirmation_rank: rank,
      confirmed_at: reservation.confirmed_at ?? new Date().toISOString(),
    });
  });

  // 5. Executa atualização em lote
  const updatedReservations = await reservationRepository.updateBatch(updates);

  const confirmed = updatedReservations.filter((r) => r.status === "confirmado");
  const waitlisted = updatedReservations.filter((r) => r.status === "lista_espera");

  return {
    confirmed,
    waitlisted,
    positionChangeEvents,
  };
}
