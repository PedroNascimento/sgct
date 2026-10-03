/**
 * Interface do repositório de Alas (Wards).
 * Artigo I da Constituição: use-cases dependem apenas de abstrações.
 */

import type { Ward } from "@/domain/types/ward";

export interface WardRepository {
  findById(id: string): Promise<Ward | null>;
  findByStakeId(stakeId: string): Promise<Ward[]>;
  findByName(stakeId: string, name: string): Promise<Ward | null>;
  create(stakeId: string, name: string): Promise<Ward>;
  update(id: string, name: string): Promise<Ward>;
  toggleActive(id: string, isActive: boolean): Promise<Ward>;
  delete(id: string): Promise<void>;
  hasAssociatedData(id: string): Promise<{ hasMembers: boolean; hasReservations: boolean }>;
}


