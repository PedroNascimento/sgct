/**
 * Use-case: createWard
 *
 * Cadastro de Alas por Administrador da Estaca.
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode cadastrar Ala (Artigo II.e).
 * - O stake_id é SEMPRE derivado da sessão do admin_estaca (Artigo II.c).
 * - Validação Zod estrita (Artigo V.a).
 * - Não permite Alas duplicadas com mesmo nome na mesma Estaca (case-insensitive).
 */

import { createWardSchema } from "@/domain/schemas/ward";
import type { Ward } from "@/domain/types/ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface CreateWardInputData {
  name: string;
}

export interface CreateWardDependencies {
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

export async function createWard(
  input: CreateWardInputData,
  actingAdminEstacaId: string,
  deps: CreateWardDependencies
): Promise<Ward> {
  // 1. Verificar permissões do executor (Artigo II.e)
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (
    !actingAdmin ||
    !actingAdmin.is_active ||
    actingAdmin.role !== "admin_estaca" ||
    !actingAdmin.stake_id
  ) {
    throw new Error("Apenas administradores de Estaca podem cadastrar Alas.");
  }

  // 2. Validação Zod com stake_id derivado da sessão (Artigo II.c e Artigo V.a)
  const parsed = createWardSchema.safeParse({
    stakeId: actingAdmin.stake_id,
    name: input.name,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para cadastro da Ala.");
  }

  const { stakeId, name } = parsed.data;

  // 3. Verificar unicidade do nome na Estaca
  const existingWard = await deps.wardRepository.findByName(stakeId, name);
  if (existingWard) {
    throw new Error("Já existe uma Ala com este nome nesta Estaca.");
  }

  // 4. Criar a Ala
  return deps.wardRepository.create(stakeId, name);
}
