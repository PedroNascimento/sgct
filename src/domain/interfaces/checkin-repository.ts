/**
 * Contrato de repositório para Check-in de Embarque (Spec 007).
 * Artigo I da Constituição: camada domain/ pura, sem frameworks.
 */

import type { CheckIn, CheckInDirection } from "@/domain/types/checkin";

export interface CreateCheckInData {
  reservation_id: string;
  direction: CheckInDirection;
  checked_in_by: string;
  synced_offline?: boolean;
  checked_in_at?: string;
  stake_id?: string;
  ward_id?: string;
}

export interface CheckInPassengerInfo {
  reservationId: string;
  token: string;
  seatNumber: number;
  passengerName: string;
  wardName: string;
  category: string;
}

export interface CheckInRepository {
  createCheckIn(data: CreateCheckInData): Promise<CheckIn>;
  findByReservationAndDirection(
    reservationId: string,
    direction: CheckInDirection
  ): Promise<CheckIn | null>;
  listByCaravan(caravanId: string): Promise<CheckIn[]>;
  listValidCaravanTokens(caravanId: string): Promise<CheckInPassengerInfo[]>;
}
