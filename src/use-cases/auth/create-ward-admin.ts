/**
 * Use-case: createWardAdmin (T001.6, T001.7)
 *
 * Criação de um Admin Ala por um Admin Estaca da mesma Estaca (US-001.3).
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode invocar este use-case.
 * - O wardId DEVE pertencer à mesma stake_id do admin_estaca (Artigo II.d).
 * - Tentativa de criar admin para Ward de outra Estaca é estritamente rejeitada.
 */

import { createWardAdminSchema, type CreateWardAdminInput } from "@/domain/schemas/auth";
import type { Profile } from "@/domain/types/tenant";
import type { AuthPort } from "@/domain/interfaces/auth-port";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface CreateWardAdminDependencies {
  authPort: AuthPort;
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

export async function createWardAdmin(
  input: CreateWardAdminInput,
  actingAdminEstacaId: string,
  deps: CreateWardAdminDependencies
): Promise<Profile> {
  // Artigo V — Validação Zod
  const parsed = createWardAdminSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para Admin Ala.");
  }

  const { wardId, email, fullName, password, birthDate, sexo } = parsed.data;

  // 1. Verificar permissões do executor
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (!actingAdmin || !actingAdmin.is_active || actingAdmin.role !== "admin_estaca") {
    throw new Error("Apenas administradores de Estaca podem cadastrar administradores de Ala.");
  }

  // 2. Verificar a Ala e o isolamento de Estaca (Artigo II)
  const ward = await deps.wardRepository.findById(wardId);
  if (!ward) {
    throw new Error("Ala informada não foi encontrada.");
  }

  if (ward.stake_id !== actingAdmin.stake_id) {
    throw new Error("A Ala informada não pertence à sua Estaca.");
  }

  // 3. Criar usuário no Auth com role e claims
  const { userId } = await deps.authPort.signUp({
    email,
    password,
    fullName,
    metadata: {
      role: "admin_ala",
      stake_id: ward.stake_id,
      ward_id: ward.id,
    },
  });

  // 4. Criar Profile
  return deps.profileRepository.insert({
    id: userId,
    stake_id: ward.stake_id,
    ward_id: ward.id,
    full_name: fullName,
    birth_date: birthDate,
    sexo: sexo ?? null,
    cpf: null,
    phone: null,
    role: "admin_ala",
    home_stake_name: null,
    home_ward_name: null,
    guardian_id: null,
    is_active: true,
  });
}
