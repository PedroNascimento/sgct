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

export type AdminEstacaItem = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  stake_id: string;
  stake_name: string;
  stake_slug: string;
  created_at: string;
};

/**
 * Lista todos os administradores de Estaca cadastrados na plataforma.
 */
export async function getAdminsList(): Promise<AdminEstacaItem[]> {
  try {
    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    // 1. Buscar profiles com role admin_estaca ou que possuam stake_id
    const { data: profiles, error: pError } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, is_active, stake_id, created_at, stakes(id, name, slug)")
      .in("role", ["admin_estaca", "member"])
      .not("stake_id", "is", null)
      .order("created_at", { ascending: false });

    if (pError || !profiles) return [];

    // 2. Buscar usuários do auth para obter e-mails
    const { data: authData } = await serviceClient.auth.admin.listUsers();
    const userEmails = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return profiles.map((p) => {
      const stakeData = Array.isArray(p.stakes) ? p.stakes[0] : p.stakes;
      return {
        id: p.id,
        full_name: p.full_name,
        email: userEmails.get(p.id) ?? "",
        role: p.role,
        is_active: p.is_active,
        stake_id: p.stake_id!,
        stake_name: stakeData?.name ?? "Estaca não identificada",
        stake_slug: stakeData?.slug ?? "",
        created_at: p.created_at,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Ativa ou desativa o acesso de um usuário administrador de Estaca.
 */
export async function toggleAdminStatusAction(
  userId: string,
  isActive: boolean
): Promise<ActionState> {
  try {
    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    const { error: pError } = await serviceClient
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId);

    if (pError) throw new Error(pError.message);

    revalidatePath("/admins");
    return {
      success: true,
      message: `Status do usuário atualizado para ${isActive ? "Ativo" : "Inativo"}.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alterar status do usuário.",
    };
  }
}

/**
 * Concede ou revoga permissão de Admin de Estaca (permite alternar entre admin_estaca e member).
 */
export async function updateAdminRoleAction(
  userId: string,
  newRole: "admin_estaca" | "member"
): Promise<ActionState> {
  try {
    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    // 1. Atualizar profile
    const { data: profile, error: pError } = await serviceClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)
      .select("stake_id")
      .single();

    if (pError) throw new Error(pError.message);

    // 2. Atualizar claims no Auth metadata
    await serviceClient.auth.admin.updateUserById(userId, {
      app_metadata: {
        role: newRole,
        stake_id: profile?.stake_id,
      },
    });

    revalidatePath("/admins");
    return {
      success: true,
      message: `Permissão alterada com sucesso para "${newRole === "admin_estaca" ? "Admin da Estaca" : "Membro Comum"}".`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar permissão.",
    };
  }
}

/**
 * Ativa ou desativa uma Estaca na plataforma.
 */
export async function toggleStakeStatusAction(
  stakeId: string,
  isActive: boolean
): Promise<ActionState> {
  try {
    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    const { error } = await serviceClient
      .from("stakes")
      .update({ is_active: isActive })
      .eq("id", stakeId);

    if (error) throw new Error(error.message);

    revalidatePath("/estacas");
    return {
      success: true,
      message: `Estaca ${isActive ? "ativada" : "desativada"} com sucesso.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alterar status da Estaca.",
    };
  }
}
