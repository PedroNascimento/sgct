"use server";

/**
 * Server Actions para o painel Super Admin (Spec 000).
 *
 * Artigo I: orquestra use-cases sem acoplar regras de negócio à UI.
 * Artigo II.f: restrito exclusivamente a super_admin.
 * Artigo V: validação com Zod antes de qualquer operação.
 */

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseAuthAdmin } from "@/infrastructure/supabase/supabase-auth-admin";
import { createStake } from "@/use-cases/tenant/create-stake";
import { createBootstrapAdminEstaca } from "@/use-cases/tenant/create-bootstrap-admin-estaca";

/**
 * Garante que o chamador atual possui a role super_admin.
 * Lança erro caso não autenticado ou papel diferente.
 */
async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    throw new Error("Não autenticado.");
  }

  const role = data.session.user.app_metadata?.role;
  if (role !== "super_admin") {
    throw new Error("Acesso negado: requer perfil Super Admin.");
  }

  return data.session.user;
}

export type ActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Cria uma nova Estaca a partir do formulário do Super Admin.
 */
export async function createStakeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertSuperAdmin();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    const serviceClient = createSupabaseServiceClient();
    const stakeRepo = new SupabaseStakeRepository(serviceClient);

    const stake = await createStake({ name, slug }, stakeRepo);

    revalidatePath("/super-admin/estacas");
    return {
      success: true,
      message: `Estaca "${stake.name}" cadastrada com sucesso!`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro desconhecido ao criar Estaca.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Cria o primeiro Admin de Estaca (bootstrap) para uma Estaca cadastrada.
 */
export async function createBootstrapAdminEstacaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await assertSuperAdmin();

    const stakeId = formData.get("stakeId") as string;
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const password = formData.get("password") as string;
    const birthDate = formData.get("birthDate") as string;

    const serviceClient = createSupabaseServiceClient();
    const authAdmin = new SupabaseAuthAdmin(serviceClient);
    const profileRepo = new SupabaseProfileRepository(serviceClient);

    const profile = await createBootstrapAdminEstaca(
      { stakeId, email, fullName, password, birthDate },
      authAdmin,
      profileRepo
    );

    revalidatePath("/super-admin/admins");
    return {
      success: true,
      message: `Admin de Estaca "${profile.full_name}" criado com sucesso!`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Erro desconhecido ao criar Admin de Estaca.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Lista todas as Estacas para exibição nas telas de Super Admin.
 */
export async function getStakesList() {
  try {
    const serviceClient = createSupabaseServiceClient();
    const stakeRepo = new SupabaseStakeRepository(serviceClient);
    return await stakeRepo.findAll();
  } catch {
    return [];
  }
}
