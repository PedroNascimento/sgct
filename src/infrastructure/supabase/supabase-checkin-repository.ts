/**
 * Implementação do CheckInRepository no Supabase (Spec 007).
 * Artigo I: camada infrastructure/.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckInRepository,
  CreateCheckInData,
  CheckInPassengerInfo,
} from "@/domain/interfaces/checkin-repository";
import type { CheckIn, CheckInDirection } from "@/domain/types/checkin";

export class SupabaseCheckInRepository implements CheckInRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createCheckIn(data: CreateCheckInData): Promise<CheckIn> {
    const { data: created, error } = await this.supabase
      .from("checkins")
      .insert({
        reservation_id: data.reservation_id,
        direction: data.direction,
        checked_in_by: data.checked_in_by,
        synced_offline: data.synced_offline ?? false,
        checked_in_at: data.checked_in_at || new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao registrar check-in: ${error.message}`);
    }

    return created as CheckIn;
  }

  async findByReservationAndDirection(
    reservationId: string,
    direction: CheckInDirection
  ): Promise<CheckIn | null> {
    const { data, error } = await this.supabase
      .from("checkins")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("direction", direction)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao consultar check-in: ${error.message}`);
    }

    return data as CheckIn | null;
  }

  async listByCaravan(caravanId: string): Promise<CheckIn[]> {
    const { data, error } = await this.supabase
      .from("checkins")
      .select("*, reservations!inner(caravan_id)")
      .eq("reservations.caravan_id", caravanId);

    if (error) {
      throw new Error(`Erro ao listar check-ins da caravana: ${error.message}`);
    }

    return (data || []).map((row) => {
      const { reservations, ...checkIn } = row;
      return checkIn as CheckIn;
    });
  }

  async listValidCaravanTokens(caravanId: string): Promise<CheckInPassengerInfo[]> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select(`
        id,
        seat_number,
        category,
        qr_token,
        profiles!inner(full_name),
        wards!inner(name)
      `)
      .eq("caravan_id", caravanId)
      .in("status", ["confirmado", "presente"]);

    if (error) {
      throw new Error(
        `Erro ao listar tokens válidos da caravana: ${error.message}`
      );
    }

    return (data || [])
      .filter((r: any) => Boolean(r.qr_token))
      .map((r: any) => ({
        reservationId: r.id,
        token: r.qr_token,
        seatNumber: r.seat_number,
        passengerName: r.profiles?.full_name || "Passageiro",
        wardName: r.wards?.name || "Ala",
        category: r.category,
      }));
  }
}
