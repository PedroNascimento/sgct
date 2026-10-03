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
      .select("id, stake_id, name, is_active, created_at")
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
      .select("id, stake_id, name, is_active, created_at")
      .eq("stake_id", stakeId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar Alas da Estaca: ${error.message}`);
    }

    return (data ?? []) as Ward[];
  }

  async findByName(stakeId: string, name: string): Promise<Ward | null> {
    const { data, error } = await this.supabase
      .from("wards")
      .select("id, stake_id, name, is_active, created_at")
      .eq("stake_id", stakeId)
      .ilike("name", name.trim())
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar Ala por nome: ${error.message}`);
    }

    return data as Ward | null;
  }

  async create(stakeId: string, name: string): Promise<Ward> {
    const { data, error } = await this.supabase
      .from("wards")
      .insert({
        stake_id: stakeId,
        name: name.trim(),
        is_active: true,
      })
      .select("id, stake_id, name, is_active, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe uma Ala com este nome nesta Estaca.");
      }
      throw new Error(`Erro ao cadastrar Ala: ${error.message}`);
    }

    return data as Ward;
  }

  async update(id: string, name: string): Promise<Ward> {
    const { data, error } = await this.supabase
      .from("wards")
      .update({
        name: name.trim(),
      })
      .eq("id", id)
      .select("id, stake_id, name, is_active, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe uma Ala com este nome nesta Estaca.");
      }
      throw new Error(`Erro ao atualizar Ala: ${error.message}`);
    }

    return data as Ward;
  }

  async toggleActive(id: string, isActive: boolean): Promise<Ward> {
    const { data, error } = await this.supabase
      .from("wards")
      .update({
        is_active: isActive,
      })
      .eq("id", id)
      .select("id, stake_id, name, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Erro ao alterar status da Ala: ${error.message}`);
    }

    return data as Ward;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("wards")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Erro ao excluir Ala: ${error.message}`);
    }
  }

  async hasAssociatedData(id: string): Promise<{ hasMembers: boolean; hasReservations: boolean }> {
    const [profilesRes, reservationsRes] = await Promise.all([
      this.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("ward_id", id),
      this.supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("ward_id", id),
    ]);

    return {
      hasMembers: (profilesRes.count ?? 0) > 0,
      hasReservations: (reservationsRes.count ?? 0) > 0,
    };
  }
}

