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
} from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { createStake } from "@/use-cases/tenant/create-stake";

/**
 * Garante que o chamador atual possui a role super_admin.
 * Lança erro caso não autenticado ou papel diferente.
 */
async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Não autenticado.");
  }

  const role = data.user.app_metadata?.role;
  if (role !== "super_admin") {
    throw new Error("Acesso negado: requer perfil Super Admin.");
  }

  return data.user;
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

    const supabase = await createSupabaseServerClient();
    const stakeRepo = new SupabaseStakeRepository(supabase);

    const stake = await createStake({ name, slug }, stakeRepo);

    revalidatePath("/estacas");
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: {
        operation: "create_bootstrap_admin", stakeId, email, fullName,
        password, birthDate,
      },
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Falha ao criar Admin de Estaca.");
    const profile = data.profile as { full_name: string };

    revalidatePath("/admins");
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
    await assertSuperAdmin();
    const supabase = await createSupabaseServerClient();
    const stakeRepo = new SupabaseStakeRepository(supabase);
    return await stakeRepo.findAll();
  } catch {
    return [];
  }
}
