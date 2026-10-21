import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AidRepository,
  CreateAidRequestData,
} from "@/domain/interfaces/aid-repository";
import type { AidRequest, AidStatus } from "@/domain/types/aid";

export class SupabaseAidRepository implements AidRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateAidRequestData): Promise<AidRequest> {
    const { data: created, error } = await this.supabase
      .from("aid_requests")
      .insert({
        reservation_id: data.reservation_id,
        aid_type: data.aid_type,
        requested_by: data.requested_by,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao registrar pedido de auxílio: ${error.message}`);
    }

    return created as AidRequest;
  }

  async findById(id: string): Promise<AidRequest | null> {
    const { data, error } = await this.supabase
      .from("aid_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar pedido de auxílio: ${error.message}`);
    }

    return (data as AidRequest) ?? null;
  }

  async findByReservationId(reservationId: string): Promise<AidRequest | null> {
    const { data, error } = await this.supabase
      .from("aid_requests")
      .select("*")
      .eq("reservation_id", reservationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar auxílio por reserva: ${error.message}`);
    }

    return (data as AidRequest) ?? null;
  }

  async findPendingByWard(stakeId: string, wardId: string): Promise<AidRequest[]> {
    const { data, error } = await this.supabase
      .from("aid_requests")
      .select("*, reservations!inner(seat_number, user_id, payment_amount, profiles!reservations_user_id_fkey(full_name))")
      .eq("stake_id", stakeId)
      .eq("ward_id", wardId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar auxílios da ala: ${error.message}`);
    }

    return (data as AidRequest[]) ?? [];
  }

  async findPendingByStake(stakeId: string): Promise<AidRequest[]> {
    const { data, error } = await this.supabase
      .from("aid_requests")
      .select("*, reservations!inner(seat_number, user_id, payment_amount, profiles!reservations_user_id_fkey(full_name))")
      .eq("stake_id", stakeId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar auxílios da estaca: ${error.message}`);
    }

    return (data as AidRequest[]) ?? [];
  }

  async updateStatus(
    id: string,
    status: AidStatus,
    approvedBy: string,
    notes?: string | null
  ): Promise<AidRequest> {
    const updates: Record<string, unknown> = {
      status,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data, error } = await this.supabase
      .from("aid_requests")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status do auxílio: ${error.message}`);
    }

    return data as AidRequest;
  }
}
