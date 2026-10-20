/**
 * Use-case: Expirar Créditos não utilizados após 12 meses (Spec 005 / US-005.3 / T005.7).
 *
 * Regras:
 * - Executado diariamente via job pg_cron (T005.8).
 * - Identifica créditos com status 'active' cuja data 'expires_at' é <= data atual.
 * - Transiciona status para 'expired'.
 */

import { expireCreditsSchema, type ExpireCreditsInput } from "@/domain/schemas/credit";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { CreditLedgerEntry } from "@/domain/types/credit";

export interface ExpireCreditsDependencies {
  creditRepository: CreditRepository;
}

export interface ExpireCreditsResult {
  expiredCount: number;
  expiredEntries: CreditLedgerEntry[];
}

export async function expireCredits(
  input: ExpireCreditsInput,
  deps: ExpireCreditsDependencies
): Promise<ExpireCreditsResult> {
  const { creditRepository } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = expireCreditsSchema.parse(input);

  const referenceDate = validated.currentDate
    ? new Date(validated.currentDate).toISOString()
    : new Date().toISOString();

  // 2. Busca créditos ativos com expiração atingida
  const expiredActiveEntries = await creditRepository.findExpiredActive(referenceDate);

  const updatedEntries: CreditLedgerEntry[] = [];

  // 3. Atualiza o status de cada crédito para 'expired'
  for (const entry of expiredActiveEntries) {
    const updated = await creditRepository.updateStatus(entry.id, "expired");
    updatedEntries.push(updated);
  }

  return {
    expiredCount: updatedEntries.length,
    expiredEntries: updatedEntries,
  };
}
