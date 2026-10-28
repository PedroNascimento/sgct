"use server";

/**
 * Server Actions para o painel Super Admin (Spec 000).
 *
 * Artigo I: orquestra use-cases sem acoplar regras de negócio à UI.
 * Artigo II.f: restrito exclusivamente a super_admin.
 * Artigo V: validação com Zod antes de qualquer operação.
 *
 * DECISÃO D32: Admins não são criados pelo painel — são membros existentes promovidos.
 * O fluxo correto é: cadastrar-se como membro → receber promoção de permissão.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { SupabaseAuditLogRepository } from "@/infrastructure/supabase/supabase-audit-log-repository";
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

const createStakeInputSchema = z.object({
  name: z.string().min(3, "Nome da Estaca deve ter no mínimo 3 caracteres"),
  slug: z.string().min(2, "Slug deve ter no mínimo 2 caracteres"),
});

const searchMemberInputSchema = z.object({
  email: z.string().email("E-mail inválido"),
  stakeId: z.string().uuid("ID de Estaca inválido"),
});

const promoteToStakeAdminInputSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  stakeId: z.string().uuid("ID de Estaca inválido"),
});

/**
 * Cria uma nova Estaca a partir do formulário do Super Admin.
 */
export async function createStakeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const superAdmin = await assertSuperAdmin();

    const validated = createStakeInputSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
    });

    const supabase = await createSupabaseServerClient();
    const stakeRepo = new SupabaseStakeRepository(supabase);

    const stake = await createStake(validated, stakeRepo);

    // Registrar em audit_logs (T010.5 / Artigo VI)
    const serviceClient = createSupabaseServiceClient();
    const auditRepo = new SupabaseAuditLogRepository(serviceClient);
    await auditRepo.recordLog({
      stakeId: stake.id,
      userId: superAdmin.id,
      action: "CREATE_STAKE",
      resourceType: "stakes",
      resourceId: stake.id,
      details: { name: stake.name, slug: stake.slug },
    });

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
 * Busca um membro existente pelo e-mail para pré-preenchimento do formulário.
 * Retorna dados básicos do profile sem expor dados sensíveis.
 */
export async function searchMemberByEmailForPromotion(
  email: string,
  stakeId: string
): Promise<{ id: string; full_name: string; role: string; ward_name: string | null } | null> {
  try {
    searchMemberInputSchema.parse({ email, stakeId });

    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    // Buscar usuário pelo e-mail no Auth
    const { data: authUsers } = await serviceClient.auth.admin.listUsers();
    const authUser = authUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) return null;

    // Buscar profile do usuário na Estaca informada
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, ward_id, wards(name)")
      .eq("id", authUser.id)
      .eq("stake_id", stakeId)
      .maybeSingle();

    if (!profile) return null;

    const wardData = Array.isArray(profile.wards) ? profile.wards[0] : profile.wards;
    return {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      ward_name: (wardData as { name: string } | null)?.name ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Promove um membro existente a Admin de Estaca.
 * REGRA: O usuário já deve existir com role 'member' na Estaca selecionada.
 * Não cria usuários novos — apenas eleva permissão.
 */
export async function promoteToStakeAdminAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const superAdmin = await assertSuperAdmin();

    const validated = promoteToStakeAdminInputSchema.parse({
      userId: formData.get("userId"),
      stakeId: formData.get("stakeId"),
    });

    const serviceClient = createSupabaseServiceClient();

    // Verificar que o profile existe e pertence à Estaca
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, stake_id")
      .eq("id", validated.userId)
      .eq("stake_id", validated.stakeId)
      .maybeSingle();

    if (!profile) {
      throw new Error("Membro não encontrado nesta Estaca. Verifique o e-mail e a Estaca selecionada.");
    }

    if (profile.role === "admin_estaca") {
      throw new Error(`${profile.full_name} já possui permissão de Admin de Estaca.`);
    }

    // Elevar permissão
    const { error: pError } = await serviceClient
      .from("profiles")
      .update({ role: "admin_estaca" })
      .eq("id", validated.userId);

    if (pError) throw new Error(pError.message);

    // Sincronizar claims no Auth metadata
    await serviceClient.auth.admin.updateUserById(validated.userId, {
      app_metadata: {
        role: "admin_estaca",
        stake_id: validated.stakeId,
      },
    });

    // Registrar em audit_logs (T010.5 / Artigo VI)
    const auditRepo = new SupabaseAuditLogRepository(serviceClient);
    await auditRepo.recordLog({
      stakeId: validated.stakeId,
      userId: superAdmin.id,
      action: "PROMOTE_STAKE_ADMIN",
      resourceType: "profiles",
      resourceId: validated.userId,
      details: { full_name: profile.full_name },
    });

    revalidatePath("/admins");
    return {
      success: true,
      message: `"${profile.full_name}" foi promovido(a) a Admin de Estaca com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao promover membro.",
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

    // 1. Buscar profiles exclusivamente com role admin_estaca (Artigo II.f / A01)
    const { data: profiles, error: pError } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, is_active, stake_id, created_at, stakes(id, name, slug)")
      .eq("role", "admin_estaca")
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

const toggleAdminStatusInputSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  isActive: z.boolean(),
});

const updateAdminRoleInputSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  newRole: z.enum(["admin_estaca", "member"], {
    errorMap: () => ({ message: "Papel inválido. Deve ser 'admin_estaca' ou 'member'." }),
  }),
});

const toggleStakeStatusInputSchema = z.object({
  stakeId: z.string().uuid("ID de Estaca inválido"),
  isActive: z.boolean(),
});

/**
 * Ativa ou desativa o acesso de um usuário administrador de Estaca.
 */
export async function toggleAdminStatusAction(
  userId: string,
  isActive: boolean
): Promise<ActionState> {
  try {
    const validated = toggleAdminStatusInputSchema.parse({ userId, isActive });

    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    const { error: pError } = await serviceClient
      .from("profiles")
      .update({ is_active: validated.isActive })
      .eq("id", validated.userId)
      .eq("role", "admin_estaca");

    if (pError) throw new Error(pError.message);

    revalidatePath("/admins");
    return {
      success: true,
      message: `Status do usuário atualizado para ${validated.isActive ? "Ativo" : "Inativo"}.`,
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
    const validated = updateAdminRoleInputSchema.parse({ userId, newRole });

    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    // 1. Atualizar profile
    const { data: profile, error: pError } = await serviceClient
      .from("profiles")
      .update({ role: validated.newRole })
      .eq("id", validated.userId)
      .select("stake_id")
      .single();

    if (pError) throw new Error(pError.message);

    // 2. Atualizar claims no Auth metadata
    await serviceClient.auth.admin.updateUserById(validated.userId, {
      app_metadata: {
        role: validated.newRole,
        stake_id: profile?.stake_id,
      },
    });

    revalidatePath("/admins");
    return {
      success: true,
      message: `Permissão alterada com sucesso para "${validated.newRole === "admin_estaca" ? "Admin da Estaca" : "Membro Comum"}".`,
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
    const validated = toggleStakeStatusInputSchema.parse({ stakeId, isActive });

    await assertSuperAdmin();
    const serviceClient = createSupabaseServiceClient();

    const { error } = await serviceClient
      .from("stakes")
      .update({ is_active: validated.isActive })
      .eq("id", validated.stakeId);

    if (error) throw new Error(error.message);

    revalidatePath("/estacas");
    return {
      success: true,
      message: `Estaca ${validated.isActive ? "ativada" : "desativada"} com sucesso.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alterar status da Estaca.",
    };
  }
}

