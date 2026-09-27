/**
 * Use-case: listPublicCaravans (T002.6, T002.7)
 *
 * Consulta do calendário público de caravanas de uma Estaca (US-002.2).
 *
 * Regras não-negociáveis:
 * - Filtra estritamente pelo stake_id resolvido da rota /[estaca_slug] (Artigo II.d).
 * - Retorna exclusivamente dados agregados de ocupação e horários.
 * - NENHUM campo de PII (dados de identificação pessoal de membros) é exposto.
 */

import { z } from "zod";
import type { CaravanPublicSummary } from "@/domain/types/caravan";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";

const stakeIdSchema = z.string().uuid("ID da Estaca inválido.");

export interface ListPublicCaravansDependencies {
  caravanRepository: CaravanRepository;
}

export async function listPublicCaravans(
  stakeId: string,
  deps: ListPublicCaravansDependencies
): Promise<CaravanPublicSummary[]> {
  const parsed = stakeIdSchema.safeParse(stakeId);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "ID da Estaca inválido.");
  }

  return deps.caravanRepository.findPublicSummariesByStakeId(parsed.data);
}
