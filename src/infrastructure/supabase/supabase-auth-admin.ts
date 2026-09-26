/**
 * Adaptador para a Auth Admin API do Supabase.
 * Artigo I: vive em infrastructure/
 * Artigo V: usa service_role do Supabase apenas em ambiente server-side.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthAdminPort } from "@/use-cases/tenant/create-bootstrap-admin-estaca";

export class SupabaseAuthAdmin implements AuthAdminPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async createUser(params: {
    email: string;
    password: string;
    email_confirm: boolean;
    user_metadata?: Record<string, unknown>;
  }): Promise<{ data: { user: { id: string } | null } | null; error: Error | null }> {
    const response = await this.supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: params.email_confirm,
      user_metadata: params.user_metadata,
    });

    if (response.error) {
      return {
        data: null,
        error: new Error(response.error.message),
      };
    }

    return {
      data: {
        user: response.data.user ? { id: response.data.user.id } : null,
      },
      error: null,
    };
  }
}
