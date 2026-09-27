/**
 * Use-case: updateCaravanStatus (T002.3, T002.4)
 *
 * Atualização do status de uma Caravana (ex: cancelamento, confirmação).
 *
 * Regras não-negociáveis:
 * - Apenas admin_estaca ativo pode alterar status (Artigo II.e).
 * - O admin só pode alterar caravanas da SUA própria Estaca (Artigo II.a e II.d).
 *   Tentativa cross-stake é estritamente rejeitada.
 * - Validação de entrada via Zod (Artigo V).
 * - Sem UPDATE direto via client: sempre orquestrado pelo use-case (Artigo III).
 */

import {
  updateCaravanStatusSchema,
  type UpdateCaravanStatusInput,
} from "@/domain/schemas/caravan";
import type { Caravan } from "@/domain/types/caravan";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface UpdateCaravanStatusDependencies {
  caravanRepository: CaravanRepository;
  profileRepository: ProfileRepository;
}

export async function updateCaravanStatus(
  input: UpdateCaravanStatusInput,
  actingAdminEstacaId: string,
  deps: UpdateCaravanStatusDependencies
): Promise<Caravan> {
  // 1. Validação Zod (Artigo V)
  const parsed = updateCaravanStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para alteração de status.");
  }

  const { caravanId, status } = parsed.data;

  // 2. Verificar permissões do executor (Artigo II.e)
  const actingAdmin = await deps.profileRepository.findById(actingAdminEstacaId);
  if (
    !actingAdmin ||
    !actingAdmin.is_active ||
    actingAdmin.role !== "admin_estaca" ||
    !actingAdmin.stake_id
  ) {
    throw new Error("Apenas administradores de Estaca podem alterar status de caravanas.");
  }

  // 3. Buscar a caravana
  const caravan = await deps.caravanRepository.findById(caravanId);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  // 4. Bloquear qualquer modificação cross-stake (Artigo II.a, T002.3)
  if (caravan.stake_id !== actingAdmin.stake_id) {
    throw new Error("Você não tem permissão para alterar caravanas de outra Estaca.");
  }

  // 5. Executar a transição de status (Artigo III)
  return deps.caravanRepository.updateStatus(caravanId, status);
}
