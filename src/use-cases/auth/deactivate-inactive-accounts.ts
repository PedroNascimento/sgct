/**
 * Use-case: deactivateInactiveAccounts (T001.9, T001.10, T001.11)
 *
 * Inativação automática de contas sem login há 24 meses (D14).
 * Executado periodicamente por job pg_cron / Edge Function.
 *
 * Regras não-negociáveis:
 * - Conta inativa há 24 meses: is_active = false.
 * - Conta com 23 meses e 29 dias permanece ativa (teste de limite).
 * - NUNCA exclui dados de membros, reservas ou créditos (apenas altera is_active).
 */

import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export async function deactivateInactiveAccounts(
  profileRepository: ProfileRepository,
  now: Date = new Date()
): Promise<{ deactivatedCount: number }> {
  // Limite estrito de 24 meses
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - 24);

  return profileRepository.deactivateInactive(cutoffDate);
}
