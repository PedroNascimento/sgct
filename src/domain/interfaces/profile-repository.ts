/**
 * Interface do repositório de perfis (Profiles).
 * Artigo I: desacopla use-cases de banco de dados.
 */

import type { Profile } from "@/domain/types/tenant";

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>;
  insert(data: Omit<Profile, "is_minor" | "last_login_at" | "created_at">): Promise<Profile>;
  updateRole(id: string, role: Profile["role"]): Promise<Profile>;
  deactivateInactive(cutoffDate: Date): Promise<{ deactivatedCount: number }>;
}
