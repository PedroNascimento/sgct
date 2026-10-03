/**
 * Use-case: deleteWard
 *
 * Exclusão definitiva de uma Ala por Administrador da Estaca.
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode excluir Alas (Artigo II.e).
 * - A Ala deve pertencer à mesma Estaca do admin (Artigo II.d).
 * - Bloqueia exclusão caso a Ala possua membros ou reservas vinculadas.
 */

import type { WardRepository } from "@/domain/interfaces/ward-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface DeleteWardDependencies {
  wardRepository: WardRepository;
  profileRepository: ProfileRepository;
}

export async function deleteWard(
  wardId: string,
  actingAdminEstacaId: string,
  deps: DeleteWardDependencies
): Promise<void> {
  // 1. Verificar permissões do executor (Artigo II.e)
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (
    !actingAdmin ||
    !actingAdmin.is_active ||
    actingAdmin.role !== "admin_estaca" ||
    !actingAdmin.stake_id
  ) {
    throw new Error("Apenas administradores de Estaca podem excluir Alas.");
  }

  // 2. Verificar se a Ala existe e pertence à mesma Estaca (Artigo II.d)
  const currentWard = await deps.wardRepository.findById(wardId);
  if (!currentWard || currentWard.stake_id !== actingAdmin.stake_id) {
    throw new Error("Ala não encontrada ou não pertence à sua Estaca.");
  }

  // 3. Verificar vínculos com membros e reservas
  const { hasMembers, hasReservations } = await deps.wardRepository.hasAssociatedData(wardId);
  if (hasMembers || hasReservations) {
    throw new Error(
      "Não é possível excluir esta Ala pois ela possui membros ou reservas associadas. Utilize a opção de inativar."
    );
  }

  // 4. Executar exclusão
  await deps.wardRepository.delete(wardId);
}
