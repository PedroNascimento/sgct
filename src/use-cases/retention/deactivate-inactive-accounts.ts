/**
 * Use-case: Inativação Automática de Contas Inativas (Spec 009 / T009.7 / US-009.4 / D14).
 *
 * Regras:
 * - Contas sem login há mais de 24 meses são inativadas (is_active = false).
 * - Conta com 23 meses e 29 dias permanece ativa (teste de limite estrito).
 * - NUNCA exclui linhas ou dados históricos (Artigo VI / D14).
 */

import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface DeactivateInactiveAccountsDependencies {
  profileRepository: ProfileRepository;
}

export async function deactivateInactiveAccounts(
  deps: DeactivateInactiveAccountsDependencies,
  now: Date = new Date()
): Promise<{ deactivatedCount: number }> {
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - 24);

  return deps.profileRepository.deactivateInactive(cutoffDate);
}
