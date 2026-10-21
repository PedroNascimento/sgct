/**
 * Tipos de domínio para Convidado Inter-Estaca (Spec 013).
 * Artigo I: camada pura, sem frameworks.
 */

export interface GuestTransferConfirmation {
  id: string;
  stake_id: string;
  reservation_id: string;
  origin_stake_name: string;
  origin_ward_name: string;
  amount: number;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface CreateGuestTransferData {
  stake_id?: string;
  reservation_id: string;
  origin_stake_name: string;
  origin_ward_name: string;
  amount: number;
}
