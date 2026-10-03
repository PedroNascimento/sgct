/**
 * Use-case: toggleWardStatus
 *
 * Ativação ou Inativação de uma Ala por Administrador da Estaca.
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode alterar o status da Ala (Artigo II.e).
 * - A Ala deve pertencer à mesma Estaca do admin (Artigo II.d).
 */

import type { Ward } from "@/domain/types/ward";
import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface ToggleWardStatusInput {
  wardId: string;
  isActive: boolean;
}

export interface ToggleWardStatusDependencies {
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

export async function toggleWardStatus(
  input: ToggleWardStatusInput,
  actingAdminEstacaId: string,
  deps: ToggleWardStatusDependencies
): Promise<Ward> {
  // 1. Verificar permissões do executor (Artigo II.e)
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (
    !actingAdmin ||
    !actingAdmin.is_active ||
    actingAdmin.role !== "admin_estaca" ||
    !actingAdmin.stake_id
  ) {
    throw new Error("Apenas administradores de Estaca podem alterar o status de Alas.");
  }

  // 2. Verificar se a Ala existe e pertence à mesma Estaca (Artigo II.d)
  const currentWard = await deps.wardRepository.findById(input.wardId);
  if (!currentWard || currentWard.stake_id !== actingAdmin.stake_id) {
    throw new Error("Ala não encontrada ou não pertence à sua Estaca.");
  }

  // 3. Atualizar status
  return deps.wardRepository.toggleActive(input.wardId, input.isActive);
}
