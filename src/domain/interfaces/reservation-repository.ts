/**
 * Interface do repositório de Reservas e Manifesto de Passageiros.
 * Artigo I: desacopla use-cases de infraestrutura e banco de dados.
 */

import type {
  Reservation,
  PassengerManifestEntry,
  SeatOccupancy,
  ReservationStatus,
  ReservationCategory,
  ParticipantType,
  FundingSource,
} from "@/domain/types/reservation";

export interface CreateReservationData {
  stake_id?: string; // derivado pelo trigger
  caravan_id: string;
  user_id: string;
  ward_id?: string | null; // derivado pelo trigger
  seat_number: number;
  boarding_point_id?: string | null;
  category: ReservationCategory;
  participant_type: ParticipantType;
  funding_source: FundingSource;
  is_preferential_seating: boolean;
  family_group_member_names?: string | null;
  family_group_label?: string | null;
  companion_for_endowment_name?: string | null;
  status: ReservationStatus;
  payment_amount: number;
}

export interface CreateManifestEntryData {
  stake_id?: string; // derivado do trigger ou da reserva
  ward_id?: string; // derivado do trigger ou da reserva
  reservation_id: string;
  full_name: string;
  birth_date: string;
  filiation: string;
}

export interface UpdateReservationStatusData {
  status: ReservationStatus;
  confirmed_at?: string | null;
  confirmation_rank?: number | null;
}

export interface ReservationRepository {
  create(data: CreateReservationData): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  findByUserId(userId: string): Promise<Reservation[]>;
  findByCaravanId(caravanId: string): Promise<Reservation[]>;
  findByCaravanAndStatuses(caravanId: string, statuses: ReservationStatus[]): Promise<Reservation[]>;
  getSeatOccupancy(caravanId: string, stakeId: string): Promise<SeatOccupancy[]>;
  addManifestEntry(data: CreateManifestEntryData): Promise<PassengerManifestEntry>;
  getManifestEntriesByReservationId(reservationId: string): Promise<PassengerManifestEntry[]>;
  updateStatus(id: string, data: UpdateReservationStatusData): Promise<Reservation>;
  updateBatch(
    updates: Array<{
      id: string;
      status: ReservationStatus;
      confirmation_rank?: number | null;
      confirmed_at?: string | null;
    }>
  ): Promise<Reservation[]>;
  findPendingExpired(referenceDate: string, daysBeforeDeparture: number): Promise<Reservation[]>;
}
