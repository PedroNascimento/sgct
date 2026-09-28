/**
 * Evento de Domínio: Mudança de Posição na Caravana (Spec 004 / T004.9).
 * Consumido pela Spec 008 (Notificações) para disparo de e-mails via Resend.
 */

import type { ReservationStatus } from "@/domain/types/reservation";

export interface PositionChangeEvent {
  reservationId: string;
  userId: string;
  caravanId: string;
  previousStatus: ReservationStatus;
  newStatus: ReservationStatus;
  previousRank: number | null;
  newRank: number;
  reason: "confirmed_within_capacity" | "exceeded_capacity_waitlisted";
  timestamp: string;
}

export interface PositionChangeEventDispatcher {
  dispatch(event: PositionChangeEvent): Promise<void>;
}
