/**
 * Implementação Supabase do ProfileRepository.
 * Artigo I: vive em infrastructure/ e implementa domain/interfaces/profile-repository.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/domain/types/tenant";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar perfil: ${error.message}`);
    }

    return data as Profile | null;
  }

  async insert(
    data: Omit<Profile, "is_minor" | "last_login_at" | "created_at">
  ): Promise<Profile> {
    const { data: created, error } = await this.supabase
      .from("profiles")
      .insert({
        id: data.id,
        stake_id: data.stake_id,
        full_name: data.full_name,
        cpf: data.cpf,
        birth_date: data.birth_date,
        phone: data.phone,
        sexo: data.sexo,
        ward_id: data.ward_id,
        role: data.role,
        home_stake_name: data.home_stake_name,
        home_ward_name: data.home_ward_name,
        guardian_id: data.guardian_id,
        is_active: data.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao criar profile: ${error.message}`);
    }

    return created as Profile;
  }

  async updateRole(id: string, role: Profile["role"]): Promise<Profile> {
    const { data, error } = await this.supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar papel do usuário: ${error.message}`);
    }

    return data as Profile;
  }

  async updateOwnContact(
    id: string,
    data: Pick<Profile, "full_name" | "cpf" | "phone" | "sexo">
  ): Promise<Profile> {
    const { data: updated, error } = await this.supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar perfil: ${error.message}`);
    }

    return updated as Profile;
  }

  async deactivateInactive(cutoffDate: Date): Promise<{ deactivatedCount: number }> {
    const isoCutoff = cutoffDate.toISOString();

    // Inativa contas cujo último login foi anterior à data de corte,
    // ou que nunca logaram e foram criadas antes da data de corte.
    const { data, error } = await this.supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("is_active", true)
      .neq("role", "super_admin")
      .or(`last_login_at.lt.${isoCutoff},and(last_login_at.is.null,created_at.lt.${isoCutoff})`)
      .select("id");

    if (error) {
      throw new Error(`Erro ao inativar contas inativas: ${error.message}`);
    }

    return { deactivatedCount: data?.length ?? 0 };
  }
}
