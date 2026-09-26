/**
 * Implementação Supabase do ProfileRepository para use-cases de bootstrap/tenant.
 * Artigo I: vive em infrastructure/
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/domain/types/tenant";
import type { ProfileRepository } from "@/use-cases/tenant/create-bootstrap-admin-estaca";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

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
}
