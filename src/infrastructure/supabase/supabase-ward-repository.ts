/**
 * Implementação Supabase do WardRepository.
 * Artigo I: camada infrastructure/
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ward } from "@/domain/types/ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";

export class SupabaseWardRepository implements WardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Ward | null> {
    const { data, error } = await this.supabase
      .from("wards")
      .select("id, stake_id, name, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar Ala por ID: ${error.message}`);
    }

    return data as Ward | null;
  }

  async findByStakeId(stakeId: string): Promise<Ward[]> {
    const { data, error } = await this.supabase
      .from("wards")
      .select("id, stake_id, name, created_at")
      .eq("stake_id", stakeId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar Alas da Estaca: ${error.message}`);
    }

    return (data ?? []) as Ward[];
  }
}
