/**
 * Implementação Supabase do RetentionRepository (Spec 009 / Artigo VI / A12).
 * Artigo I: infraestrutura que implementa a interface de domínio.
 * Artigo V: operado via service_role exclusivamente nos jobs cron.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RetentionRepository,
  ExpiredMinorFormItem,
} from "@/domain/interfaces/retention-repository";

export class SupabaseRetentionRepository implements RetentionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findExpiredMinorForms(cutoffDate: Date): Promise<ExpiredMinorFormItem[]> {
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // 1. Tenta buscar via RPC otimizada com COALESCE(return_date, departure_date) (A12)
    if (typeof this.supabase.rpc === "function") {
      const { data: rpcData, error: rpcError } = await this.supabase.rpc(
        "get_expired_minor_forms",
        { p_cutoff_date: cutoffDateStr }
      );

      if (!rpcError && Array.isArray(rpcData)) {
        return rpcData.map((row: any) => ({
          id: row.id,
          stakeId: row.stake_id,
          storagePath: row.storage_path,
          caravanDepartureDate: row.caravan_departure_date ?? "",
          caravanReturnDate: row.caravan_return_date ?? null,
        }));
      }
    }

    // 2. Fallback resiliente via query direta
    const { data, error } = await this.supabase
      .from("minor_approval_forms")
      .select(
        `
        id,
        stake_id,
        storage_path,
        reservations!inner (
          caravans!inner (
            departure_date,
            return_date
          )
        )
      `
      );

    if (error || !data) {
      console.warn("Erro ao buscar formulários de menor expirados:", error?.message);
      return [];
    }

    return (data || [])
      .filter((row: any) => {
        const c = row.reservations?.caravans;
        if (!c) return false;
        const endStr = c.return_date || c.departure_date;
        return endStr && endStr <= cutoffDateStr;
      })
      .map((row: any) => ({
        id: row.id,
        stakeId: row.stake_id,
        storagePath: row.storage_path,
        caravanDepartureDate: row.reservations?.caravans?.departure_date ?? "",
        caravanReturnDate: row.reservations?.caravans?.return_date ?? null,
      }));
  }

  async deleteMinorForm(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("minor_approval_forms")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(
        `Erro ao excluir formulário de menor ${id}: ${error.message}`
      );
    }
  }

  async deleteExpiredManifestEntries(cutoffDate: Date): Promise<number> {
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // 1. Tenta RPC atômica purge_expired_manifest_entries instalada na migration
    const { data: rpcCount, error: rpcError } = await this.supabase.rpc(
      "purge_expired_manifest_entries",
      { p_cutoff_date: cutoffDateStr }
    );

    if (!rpcError && typeof rpcCount === "number") {
      return rpcCount;
    }

    // 2. Fallback de busca e exclusão considerando COALESCE(return_date, departure_date)
    const { data: expiredEntries, error: findError } = await this.supabase
      .from("passenger_manifest_entries")
      .select(
        `
        id,
        reservations!inner (
          caravans!inner (
            departure_date,
            return_date
          )
        )
      `
      );

    if (findError || !expiredEntries || expiredEntries.length === 0) {
      return 0;
    }

    const idsToDelete = expiredEntries
      .filter((e: any) => {
        const c = e.reservations?.caravans;
        if (!c) return false;
        const endStr = c.return_date || c.departure_date;
        return endStr && endStr <= cutoffDateStr;
      })
      .map((e: any) => e.id);

    if (idsToDelete.length === 0) return 0;

    const { error: deleteError } = await this.supabase
      .from("passenger_manifest_entries")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.warn("Erro ao excluir crianças de colo do manifesto:", deleteError.message);
      return 0;
    }

    return idsToDelete.length;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      throw new Error(`Erro ao excluir arquivo no storage (${bucket}/${path}): ${error.message}`);
    }
  }
}
