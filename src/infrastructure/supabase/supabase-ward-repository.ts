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

  async findByName(stakeId: string, name: string): Promise<Ward | null> {
    const { data, error } = await this.supabase
      .from("wards")
      .select("id, stake_id, name, created_at")
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
      })
      .select("id, stake_id, name, created_at")
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
      .select("id, stake_id, name, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe uma Ala com este nome nesta Estaca.");
      }
      throw new Error(`Erro ao atualizar Ala: ${error.message}`);
    }

    return data as Ward;
  }
}

