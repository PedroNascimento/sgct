/**
 * Interface do repositório de Estacas.
 * Definida em domain/ para que os use-cases dependam apenas da abstração
 * (nunca da implementação concreta Supabase — Artigo I da Constituição).
 */

import type { Stake } from "@/domain/types/tenant";

export interface StakeRepository {
  findBySlug(slug: string): Promise<Stake | null>;
  insert(data: Omit<Stake, "id" | "created_at">): Promise<Stake>;
}
