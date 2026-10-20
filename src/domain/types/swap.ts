/**
 * Tipos de domínio para Permuta de Assento (Spec 005 / US-005.2).
 * Artigo I: camada domain pura, sem frameworks.
 */

export type SeatSwapStatus = "pending" | "approved" | "rejected";

export interface SeatSwapRequest {
  id: string;
  stake_id: string;
  ward_id: string;
  original_reservation_id: string;
  new_holder_full_name: string;
  new_holder_document: string | null;
  requested_by: string;
  status: SeatSwapStatus;
  created_at: string;
}
