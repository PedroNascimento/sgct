/**
 * Use-case: resolveStakeFromSlug
 *
 * Resolve um slug de URL para o objeto Stake correspondente.
 * Retorna null se o slug não existe OU se a Stake está inativa.
 *
 * Usado pelo middleware para resolução de tenant antes de qualquer
 * verificação de autenticação (ARCHITECTURE.md seção 3.1).
 *
 * Artigo I: depende apenas de domain/ — sem imports de infrastructure/.
 */

import type { Stake } from "@/domain/types/tenant";
import type { StakeRepository } from "@/domain/interfaces/stake-repository";

export async function resolveStakeFromSlug(
  slug: string,
  repository: StakeRepository
): Promise<Stake | null> {
  const stake = await repository.findBySlug(slug);

  // Retorna null para slug inexistente E para Estacas inativas (US-000.3)
  if (!stake || !stake.is_active) {
    return null;
  }

  return stake;
}
