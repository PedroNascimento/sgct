/**
 * Use-case: createBootstrapAdminEstaca
 *
 * Cria o primeiro Admin Estaca de uma Estaca nova.
 * Ação restrita a super_admin (verificado no middleware).
 *
 * Fluxo:
 * 1. Valida o input com Zod
 * 2. Cria o usuário no Supabase Auth (via Admin API — service_role)
 * 3. Cria o profile com role='admin_estaca' e stake_id correto
 *
 * O trigger enforce_profile_tenant_consistency sobrescreve qualquer
 * stake_id forjado (Artigo II.c, D23) — mas como este use-case é
 * executado com service_role no backend, o stake_id é confiável.
 *
 * Artigo I: depende apenas de domain/ e interfaces abstratas.
 * Artigo V: validação Zod antes de qualquer operação.
 * Artigo III: criação via use-case + Server Action, nunca UPDATE direto.
 */

import {
  createBootstrapAdminEstacaSchema,
  type CreateBootstrapAdminEstacaInput,
} from "@/domain/schemas/tenant";
import type { Profile } from "@/domain/types/tenant";

// Interfaces abstratas para as dependências (injetadas pelo caller)
export interface AuthAdminPort {
  createUser(params: {
    email: string;
    password: string;
    email_confirm: boolean;
    user_metadata?: Record<string, unknown>;
  }): Promise<{ data: { user: { id: string } | null } | null; error: Error | null }>;
}

export interface ProfileRepository {
  insert(data: Omit<Profile, "is_minor" | "last_login_at" | "created_at">): Promise<Profile>;
}

export async function createBootstrapAdminEstaca(
  input: CreateBootstrapAdminEstacaInput,
  authAdmin: AuthAdminPort,
  profileRepository: ProfileRepository
): Promise<Profile> {
  // Artigo V — validação de entrada com Zod
  const parsed = createBootstrapAdminEstacaSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Input inválido.");
  }

  const { stakeId, email, fullName, password, birthDate } = parsed.data;

  // Passo 1: Criar usuário no Supabase Auth
  const { data, error } = await authAdmin.createUser({
    email,
    password,
    email_confirm: true, // bootstrap não requer confirmação de e-mail
    user_metadata: { full_name: fullName },
  });

  if (error || !data?.user) {
    throw error ?? new Error("Falha ao criar usuário no Auth.");
  }

  const userId = data.user.id;

  // Passo 2: Criar profile com role=admin_estaca
  // O trigger enforce_profile_tenant_consistency valida o stake_id,
  // mas como passamos diretamente (backend com service_role), é confiável.
  return profileRepository.insert({
    id: userId,
    stake_id: stakeId,
    full_name: fullName,
    cpf: null,
    birth_date: birthDate,
    phone: null,
    sexo: null,
    ward_id: null, // admin_estaca não pertence a uma Ala específica
    role: "admin_estaca",
    home_stake_name: null,
    home_ward_name: null,
    guardian_id: null,
    is_active: true,
  });
}
