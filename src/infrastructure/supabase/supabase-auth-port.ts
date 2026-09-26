/**
 * Implementação Supabase da porta AuthPort.
 * Artigo I: camada infrastructure/
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthPort, SignUpParams } from "@/domain/interfaces/auth-port";

export class SupabaseAuthPort implements AuthPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async signUp(params: SignUpParams): Promise<{ userId: string }> {
    const { data, error } = await this.supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          ...params.metadata,
        },
      },
    });

    if (error || !data.user) {
      throw error ?? new Error("Falha ao registrar credenciais de usuário.");
    }

    return { userId: data.user.id };
  }
}
