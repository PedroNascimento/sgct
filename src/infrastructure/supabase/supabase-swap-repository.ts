/**
 * Implementação Supabase do SwapRepository (Spec 005 / US-005.2).
 * Artigo I: infraestrutura que implementa a interface de domínio pura.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SwapRepository,
  CreateSeatSwapData,
} from "@/domain/interfaces/swap-repository";
import type { SeatSwapRequest, SeatSwapStatus } from "@/domain/types/swap";

export class SupabaseSwapRepository implements SwapRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateSeatSwapData): Promise<SeatSwapRequest> {
    const { data: created, error } = await this.supabase
      .from("seat_swap_requests")
      .insert({
        stake_id: data.stake_id,
        ward_id: data.ward_id,
        original_reservation_id: data.original_reservation_id,
        new_holder_full_name: data.new_holder_full_name,
        new_holder_document: data.new_holder_document,
        requested_by: data.requested_by,
        status: data.status ?? "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar solicitação de permuta: ${error.message}`);
    }

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<SeatSwapRequest | null> {
    const { data, error } = await this.supabase
      .from("seat_swap_requests")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar solicitação de permuta: ${error.message}`);
    }

    return data ? this.mapToDomain(data) : null;
  }

  async findByReservationId(reservationId: string): Promise<SeatSwapRequest[]> {
    const { data, error } = await this.supabase
      .from("seat_swap_requests")
      .select()
      .eq("original_reservation_id", reservationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar permutas da reserva: ${error.message}`);
    }

    return (data ?? []).map(this.mapToDomain);
  }

  async countApprovedByCaravanAndDate(caravanId: string, date: string): Promise<number> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Busca permutas aprovadas no dia cujo original_reservation_id pertença à caravana
    const { data, error } = await this.supabase
      .from("seat_swap_requests")
      .select("id, reservations!inner(caravan_id)")
      .eq("status", "approved")
      .eq("reservations.caravan_id", caravanId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (error) {
      throw new Error(`Erro ao contar permutas aprovadas no dia: ${error.message}`);
    }

    return data ? data.length : 0;
  }

  async updateStatus(id: string, status: SeatSwapStatus): Promise<SeatSwapRequest> {
    const { data, error } = await this.supabase
      .from("seat_swap_requests")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status da permuta: ${error.message}`);
    }

    return this.mapToDomain(data);
  }

  private mapToDomain(row: Record<string, unknown>): SeatSwapRequest {
    return {
      id: row.id as string,
      stake_id: row.stake_id as string,
      ward_id: row.ward_id as string,
      original_reservation_id: row.original_reservation_id as string,
      new_holder_full_name: row.new_holder_full_name as string,
      new_holder_document: (row.new_holder_document as string) ?? null,
      requested_by: row.requested_by as string,
      status: row.status as SeatSwapStatus,
      created_at: row.created_at as string,
    };
  }
}
