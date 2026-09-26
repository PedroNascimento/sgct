"use server";

/**
 * Server Actions administrativas da Estaca (Spec 001).
 *
 * Artigo I: orquestra use-cases sem misturar regras de negócio na UI.
 * Artigo II.d: restrito a admin_estaca criando admin_ala para a mesma stake_id.
 */

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/infrastructure/supabase/server";
import { SupabaseWardRepository } from "@/infrastructure/supabase/supabase-ward-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseAuthPort } from "@/infrastructure/supabase/supabase-auth-port";
import { createWardAdmin } from "@/use-cases/auth/create-ward-admin";

export type AdminActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function createWardAdminAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      throw new Error("Não autenticado.");
    }

    const user = sessionData.session.user;
    const role = user.app_metadata?.role;
    if (role !== "admin_estaca") {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const wardId = formData.get("wardId") as string;
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const password = formData.get("password") as string;
    const birthDate = formData.get("birthDate") as string;
    const sexo = (formData.get("sexo") as "masculino" | "feminino") || undefined;

    const serviceClient = createSupabaseServiceClient();
    const wardRepository = new SupabaseWardRepository(serviceClient);
    const profileRepository = new SupabaseProfileRepository(serviceClient);
    const authPort = new SupabaseAuthPort(serviceClient);

    const createdAdmin = await createWardAdmin(
      { wardId, email, fullName, password, birthDate, sexo },
      user.id,
      { authPort, wardRepository, profileRepository }
    );

    revalidatePath("/admin");
    return {
      success: true,
      message: `Admin da Ala "${createdAdmin.full_name}" cadastrado com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao cadastrar Admin da Ala.",
    };
  }
}
