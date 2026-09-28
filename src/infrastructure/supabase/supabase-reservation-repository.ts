/**
 * Implementação Supabase do ReservationRepository (Spec 003).
 * Artigo I: camada infrastructure/.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Reservation,
  PassengerManifestEntry,
  SeatOccupancy,
} from "@/domain/types/reservation";
import type {
  ReservationRepository,
  CreateReservationData,
  CreateManifestEntryData,
} from "@/domain/interfaces/reservation-repository";

export class SupabaseReservationRepository implements ReservationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateReservationData): Promise<Reservation> {
    const { data: created, error } = await this.supabase
      .from("reservations")
      .insert({
        caravan_id: data.caravan_id,
        user_id: data.user_id,
        seat_number: data.seat_number,
        boarding_point_id: data.boarding_point_id ?? null,
        category: data.category,
        participant_type: data.participant_type,
        funding_source: data.funding_source,
        is_preferential_seating: data.is_preferential_seating,
        family_group_member_names: data.family_group_member_names ?? null,
        family_group_label: data.family_group_label ?? null,
        companion_for_endowment_name: data.companion_for_endowment_name ?? null,
        status: data.status,
        payment_amount: data.payment_amount,
      })
      .select("*")
      .single();

    if (error) {
      const err = new Error(error.message);
      (err as unknown as { code: string }).code = error.code;
      throw err;
    }

    return {
      ...created,
      payment_amount: Number(created.payment_amount),
    };
  }

  async findById(id: string): Promise<Reservation | null> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar reserva por ID: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      payment_amount: Number(data.payment_amount),
    };
  }

  async findByUserId(userId: string): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar reservas do usuário: ${error.message}`);
    }

    return (data ?? []).map((r) => ({
      ...r,
      payment_amount: Number(r.payment_amount),
    }));
  }

  async findByCaravanId(caravanId: string): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select("*")
      .eq("caravan_id", caravanId)
      .order("seat_number", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar reservas da caravana: ${error.message}`);
    }

    return (data ?? []).map((r) => ({
      ...r,
      payment_amount: Number(r.payment_amount),
    }));
  }

  async getSeatOccupancy(caravanId: string, stakeId: string): Promise<SeatOccupancy[]> {
    const { data, error } = await this.supabase
      .from("v_seat_occupancy")
      .select("stake_id, caravan_id, seat_number, occupancy_status")
      .eq("caravan_id", caravanId)
      .eq("stake_id", stakeId);

    if (error) {
      throw new Error(`Erro ao consultar ocupação de assentos: ${error.message}`);
    }

    return (data ?? []) as SeatOccupancy[];
  }

  async addManifestEntry(data: CreateManifestEntryData): Promise<PassengerManifestEntry> {
    // Buscar a reserva para herdar stake_id e ward_id se não fornecidos
    let stakeId = data.stake_id;
    let wardId = data.ward_id;

    if (!stakeId || !wardId) {
      const reservation = await this.findById(data.reservation_id);
      if (!reservation) {
        throw new Error("Reserva vinculada não encontrada para o manifesto.");
      }
      stakeId = reservation.stake_id;
      wardId = reservation.ward_id ?? undefined;
    }

    if (!wardId) {
      throw new Error("Ala não identificada para inclusão no manifesto de passageiros.");
    }

    const { data: created, error } = await this.supabase
      .from("passenger_manifest_entries")
      .insert({
        stake_id: stakeId,
        ward_id: wardId,
        reservation_id: data.reservation_id,
        full_name: data.full_name,
        birth_date: data.birth_date,
        filiation: data.filiation,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar entrada no manifesto: ${error.message}`);
    }

    return created as PassengerManifestEntry;
  }

  async getManifestEntriesByReservationId(
    reservationId: string
  ): Promise<PassengerManifestEntry[]> {
    const { data, error } = await this.supabase
      .from("passenger_manifest_entries")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("full_name", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar entradas do manifesto: ${error.message}`);
    }

    return (data ?? []) as PassengerManifestEntry[];
  }
}
