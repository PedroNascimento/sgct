/**
 * Tipos de domínio para Caravanas e Pontos de Embarque (Spec 002).
 * Artigo I da Constituição: camada domain/ pura, sem dependências externas.
 */

export type CaravanStatus =
  | "registered"
  | "draft"
  | "open"
  | "quorum_pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface BoardingPoint {
  id: string;
  caravan_id: string;
  stake_id: string;
  name: string;
  boarding_time: string; // ISO string timestamptz
}

export interface Caravan {
  id: string;
  stake_id: string;
  departure_date: string;
  return_date: string | null;
  price_standard: number;
  price_officiant: number;
  seat_limit: number;
  waitlist_limit: number;
  registration_deadline: string;
  min_quorum: number;
  quorum_check_date: string;
  status: CaravanStatus;
  caravan_leader_id: string | null;
  created_by: string;
  created_at: string;
  boarding_points?: BoardingPoint[];
}

export interface CaravanPublicSummary {
  id: string;
  stake_id: string;
  departure_date: string;
  return_date: string | null;
  price_standard: number;
  price_officiant: number;
  status: CaravanStatus;
  seat_limit: number;
  available_seats: number;
  confirmed_seats: number;
  validating_seats: number;
  waitlist_seats: number;
  boarding_points: Array<{
    name: string;
    boarding_time: string;
  }>;
}
