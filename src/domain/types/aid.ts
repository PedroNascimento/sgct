export type AidType =
  | "auxilio_area_investidura"
  | "auxilio_recem_converso"
  | "auxilio_estaca_fundo_reserva";

export type AidStatus = "pending" | "approved" | "rejected";

export interface AidRequest {
  id: string;
  stake_id: string;
  ward_id: string;
  reservation_id: string;
  aid_type: AidType;
  status: AidStatus;
  requested_by: string;
  approved_by: string | null;
  requested_at: string;
  approved_at: string | null;
  notes: string | null;
}
