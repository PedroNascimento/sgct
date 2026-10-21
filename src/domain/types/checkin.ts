/**
 * Tipos de domínio para Check-in de Embarque via QR Code (Spec 007).
 * Artigo I da Constituição: camada domain/ pura, sem frameworks.
 */

export type CheckInDirection = "ida" | "volta";

export interface CheckIn {
  id: string;
  stake_id: string;
  ward_id: string;
  reservation_id: string;
  direction: CheckInDirection;
  checked_in_by: string;
  checked_in_at: string;
  synced_offline: boolean;
}

export interface CheckInTokenPayload {
  reservationId: string;
  caravanId: string;
  stakeId: string;
  exp: number; // timestamp em segundos
}
