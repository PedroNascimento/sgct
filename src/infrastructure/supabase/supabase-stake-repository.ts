/**
 * Implementação Supabase do StakeRepository.
 * Artigo I: vive em infrastructure/ e implementa domain/interfaces/stake-repository.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stake } from "@/domain/types/tenant";
import type { StakeRepository } from "@/domain/interfaces/stake-repository";

export class SupabaseStakeRepository implements StakeRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findBySlug(slug: string): Promise<Stake | null> {
    const { data, error } = await this.supabase
      .from("stakes")
      .select("id, name, slug, is_active, created_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar Estaca por slug: ${error.message}`);
    }

    return data as Stake | null;
  }

  async insert(data: Omit<Stake, "id" | "created_at">): Promise<Stake> {
    const { data: created, error } = await this.supabase
      .from("stakes")
      .insert({
        name: data.name,
        slug: data.slug,
        is_active: data.is_active ?? true,
      })
      .select("id, name, slug, is_active, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(`Já existe uma Estaca com o slug '${data.slug}'.`);
      }
      throw new Error(`Erro ao cadastrar Estaca: ${error.message}`);
    }

    return created as Stake;
  }

  async findAll(): Promise<Stake[]> {
    const { data, error } = await this.supabase
      .from("stakes")
      .select("id, name, slug, is_active, created_at")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar Estacas: ${error.message}`);
    }

    return (data ?? []) as Stake[];
  }
}
