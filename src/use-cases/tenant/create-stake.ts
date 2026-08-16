/**
 * Use-case: createStake
 *
 * Cria uma nova Estaca (stake) na plataforma.
 * Restrito a super_admin (verificado no middleware e na policy RLS).
 *
 * Regras:
 * - Slug deve ser único (US-000.2)
 * - Slug deve ser kebab-case válido (domain/schemas/tenant.ts)
 * - Retorna erro claro se slug já existe (T000.22)
 *
 * Artigo I: sem imports de infrastructure/ ou app/.
 * Artigo V: validação Zod antes de tocar o repositório.
 */

import { createStakeSchema, type CreateStakeInput } from "@/domain/schemas/tenant";
import type { Stake } from "@/domain/types/tenant";
import type { StakeRepository } from "@/domain/interfaces/stake-repository";

export async function createStake(
  input: CreateStakeInput,
  repository: StakeRepository
): Promise<Stake> {
  // Artigo V — validação de entrada com Zod
  const parsed = createStakeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Input inválido.");
  }

  const { name, slug } = parsed.data;

  // Verificar unicidade do slug (US-000.2, T000.22)
  const existing = await repository.findBySlug(slug);
  if (existing) {
    throw new Error(`Já existe uma Estaca com o slug '${slug}'.`);
  }

  return repository.insert({ name, slug, is_active: true });
}
