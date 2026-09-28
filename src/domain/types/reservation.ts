/**
 * Tipos de domínio para Reservas, Concorrência e Vagas (Spec 003).
 * Artigo I da Constituição: camada domain/ pura, sem frameworks.
 */

export type ReservationStatus =
  | "pendente"
  | "pago_ala"
  | "aguardando_auxilio"
  | "aguardando_transferencia_interestaca"
  | "confirmado"
  | "presente"
  | "no_show"
  | "cancelada_com_credito"
  | "cancelada_sem_credito"
  | "expirada"
  | "lista_espera";

export type ReservationCategory = "standard" | "officiant";

export type ParticipantType =
  | "adulto"
  | "jovem"
  | "crianca"
  | "oficiante"
  | "investidura"
  | "selamento"
  | "missionario_servico";

export type FundingSource =
  | "membro"
  | "auxilio_area_investidura"
  | "auxilio_recem_converso"
  | "auxilio_estaca_fundo_reserva"
  | "convidado_transferencia_interestaca";

export interface Reservation {
  id: string;
  stake_id: string;
  caravan_id: string;
  user_id: string;
  ward_id: string | null;
  seat_number: number;
  boarding_point_id: string | null;
  category: ReservationCategory;
  participant_type: ParticipantType;
  funding_source: FundingSource;
  is_preferential_seating: boolean;
  family_group_member_names: string | null;
  family_group_label: string | null;
  companion_for_endowment_name: string | null;
  status: ReservationStatus;
  payment_amount: number;
  confirmed_at: string | null;
  confirmation_rank: number | null;
  qr_token: string | null;
  qr_token_expires_at: string | null;
  created_at: string;
}

export interface PassengerManifestEntry {
  id: string;
  stake_id: string;
  ward_id: string;
  reservation_id: string;
  full_name: string;
  birth_date: string;
  filiation: string;
}

export interface SeatOccupancy {
  stake_id: string;
  caravan_id: string;
  seat_number: number;
  occupancy_status: "ocupado" | "livre";
}
