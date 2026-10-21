/**
 * Implementação Supabase do RetentionRepository (Spec 009 / Artigo VI).
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

    // Busca formulários onde a caravana retornou antes do cutoff
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
      )
      .lte("reservations.caravans.return_date", cutoffDateStr);

    if (error) {
      console.warn("Erro ao buscar formulários de menor expirados:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      stakeId: row.stake_id,
      storagePath: row.storage_path,
      caravanDepartureDate:
        row.reservations?.caravans?.departure_date ?? "",
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

    // Busca IDs de manifest entries de crianças de colo em caravanas com retorno <= cutoff
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
      )
      .lte("reservations.caravans.return_date", cutoffDateStr);

    if (findError || !expiredEntries || expiredEntries.length === 0) {
      return 0;
    }

    const idsToDelete = expiredEntries.map((e: any) => e.id);

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
