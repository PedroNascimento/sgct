/**
 * Use-case: updateWard
 *
 * Edição de Ala existente por Administrador da Estaca.
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode editar Ala (Artigo II.e).
 * - O stake_id é SEMPRE derivado da sessão do admin_estaca (Artigo II.c).
 * - Validação Zod estrita (Artigo V.a).
 * - Ala deve pertencer à mesma Estaca do admin.
 * - Não permite renomear para um nome já em uso por outra Ala na mesma Estaca.
 */

import { updateWardSchema } from "@/domain/schemas/ward";
import type { Ward } from "@/domain/types/ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface UpdateWardInputData {
  wardId: string;
  name: string;
}

export interface UpdateWardDependencies {
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

export async function updateWard(
  input: UpdateWardInputData,
  actingAdminEstacaId: string,
  deps: UpdateWardDependencies
): Promise<Ward> {
  // 1. Verificar permissões do executor (Artigo II.e)
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (
    !actingAdmin ||
    !actingAdmin.is_active ||
    actingAdmin.role !== "admin_estaca" ||
    !actingAdmin.stake_id
  ) {
    throw new Error("Apenas administradores de Estaca podem editar Alas.");
  }

  // 2. Validação Zod (Artigo V.a)
  const parsed = updateWardSchema.safeParse({
    wardId: input.wardId,
    stakeId: actingAdmin.stake_id,
    name: input.name,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para edição da Ala.");
  }

  const { wardId, stakeId, name } = parsed.data;

  // 3. Verificar se a Ala existe e pertence à mesma Estaca
  const currentWard = await deps.wardRepository.findById(wardId);
  if (!currentWard || currentWard.stake_id !== stakeId) {
    throw new Error("Ala não encontrada ou não pertence à sua Estaca.");
  }

  // 4. Se o nome mudou, verificar unicidade na Estaca
  const existingWithName = await deps.wardRepository.findByName(stakeId, name);
  if (existingWithName && existingWithName.id !== wardId) {
    throw new Error("Já existe uma Ala com este nome nesta Estaca.");
  }

  // 5. Atualizar a Ala
  return deps.wardRepository.update(wardId, name);
}
