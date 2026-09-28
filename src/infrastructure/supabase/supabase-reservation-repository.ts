/**
 * Implementação Supabase do ReservationRepository (Spec 003).
 * Artigo I: camada infrastructure/.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Reservation,
  PassengerManifestEntry,
  SeatOccupancy,
  ReservationStatus,
} from "@/domain/types/reservation";
import type {
  ReservationRepository,
  CreateReservationData,
  CreateManifestEntryData,
  UpdateReservationStatusData,
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
    const { data, error } = await this.supabase.rpc("get_seat_occupancy", {
      target_caravan_id: caravanId,
    });

    if (error) {
      throw new Error(`Erro ao consultar ocupação de assentos: ${error.message}`);
    }

    return ((data ?? []) as SeatOccupancy[]).filter((row) => row.stake_id === stakeId);
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

  async updateStatus(
    id: string,
    data: UpdateReservationStatusData
  ): Promise<Reservation> {
    const updatePayload: Record<string, unknown> = {
      status: data.status,
    };
    if (data.confirmed_at !== undefined) {
      updatePayload.confirmed_at = data.confirmed_at;
    }
    if (data.confirmation_rank !== undefined) {
      updatePayload.confirmation_rank = data.confirmation_rank;
    }

    const { data: updated, error } = await this.supabase
      .from("reservations")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status da reserva: ${error.message}`);
    }

    return updated as Reservation;
  }

  async findByCaravanAndStatuses(
    caravanId: string,
    statuses: ReservationStatus[]
  ): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select("*")
      .eq("caravan_id", caravanId)
      .in("status", statuses);

    if (error) {
      throw new Error(`Erro ao buscar reservas por status: ${error.message}`);
    }

    return (data ?? []) as Reservation[];
  }

  async updateBatch(
    updates: Array<{
      id: string;
      status: ReservationStatus;
      confirmation_rank?: number | null;
      confirmed_at?: string | null;
    }>
  ): Promise<Reservation[]> {
    if (updates.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.rpc("update_reservations_batch", {
      updates_payload: updates,
    });

    if (error) {
      throw new Error(`Erro ao atualizar reservas em lote: ${error.message}`);
    }

    return (data ?? []) as Reservation[];
  }

  async findPendingExpired(
    referenceDate: string,
    daysBeforeDeparture: number
  ): Promise<Reservation[]> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select("*, caravans!inner(departure_date)")
      .eq("status", "pendente");

    if (error) {
      throw new Error(`Erro ao buscar reservas pendentes expiradas: ${error.message}`);
    }

    const ref = new Date(referenceDate);
    const thresholdMs = daysBeforeDeparture * 24 * 60 * 60 * 1000;

    return ((data ?? []) as any[])
      .filter((r) => {
        const departure = new Date(r.caravans.departure_date);
        const diffMs = departure.getTime() - ref.getTime();
        return diffMs <= thresholdMs;
      })
      .map((r) => {
        const { caravans, ...reservation } = r;
        return reservation as Reservation;
      });
  }
}
