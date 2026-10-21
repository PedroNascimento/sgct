/**
 * Implementação do repositório de Convidados Inter-Estaca no Supabase (Spec 013).
 * Artigo I da Constituição: camada de infraestrutura concreta.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GuestRepository,
  PendingGuestTransferItem,
} from "@/domain/interfaces/guest-repository";
import type {
  GuestTransferConfirmation,
  CreateGuestTransferData,
} from "@/domain/types/guest";

export class SupabaseGuestRepository implements GuestRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createTransferConfirmation(
    data: CreateGuestTransferData
  ): Promise<GuestTransferConfirmation> {
    const { data: created, error } = await this.supabase
      .from("guest_transfer_confirmations")
      .insert({
        reservation_id: data.reservation_id,
        origin_stake_name: data.origin_stake_name,
        origin_ward_name: data.origin_ward_name,
        amount: data.amount,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao registrar confirmação de transferência de convidado: ${error.message}`);
    }

    return created as GuestTransferConfirmation;
  }

  async findTransferConfirmationById(
    id: string
  ): Promise<GuestTransferConfirmation | null> {
    const { data, error } = await this.supabase
      .from("guest_transfer_confirmations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar confirmação de transferência: ${error.message}`);
    }

    return (data as GuestTransferConfirmation) ?? null;
  }

  async findTransferConfirmationByReservationId(
    reservationId: string
  ): Promise<GuestTransferConfirmation | null> {
    const { data, error } = await this.supabase
      .from("guest_transfer_confirmations")
      .select("*")
      .eq("reservation_id", reservationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar confirmação de transferência por reserva: ${error.message}`);
    }

    return (data as GuestTransferConfirmation) ?? null;
  }

  async findPendingTransfersByStake(
    stakeId: string
  ): Promise<PendingGuestTransferItem[]> {
    const { data, error } = await this.supabase
      .from("guest_transfer_confirmations")
      .select(`
        *,
        reservation:reservations(
          *,
          profile:profiles(*)
        )
      `)
      .eq("stake_id", stakeId)
      .is("confirmed_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar repasses de convidados pendentes: ${error.message}`);
    }

    return (data ?? []).map((item) => ({
      ...item,
      reservation: item.reservation ?? undefined,
      profile: item.reservation?.profile ?? undefined,
    })) as PendingGuestTransferItem[];
  }

  async confirmTransfer(
    id: string,
    confirmedBy: string
  ): Promise<GuestTransferConfirmation> {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("guest_transfer_confirmations")
      .update({
        confirmed_by: confirmedBy,
        confirmed_at: nowIso,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao confirmar repasse de convidado: ${error.message}`);
    }

    return data as GuestTransferConfirmation;
  }
}
