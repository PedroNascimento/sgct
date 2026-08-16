/**
 * Tipos de domínio do sistema multi-tenant.
 * Camada domain/ — sem dependências de framework (Artigo I da Constituição).
 */

// ─── Stake (Estaca) ──────────────────────────────────────────────────────────

export interface Stake {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export type UserRole = "member" | "admin_ala" | "admin_estaca" | "super_admin" | "guest";

export interface Profile {
  id: string;
  stake_id: string | null; // null apenas para super_admin (Artigo II.f)
  full_name: string;
  cpf: string | null;
  birth_date: string;
  phone: string | null;
  sexo: "masculino" | "feminino" | null;
  ward_id: string | null; // null para admin_estaca, super_admin e convidado
  role: UserRole;
  home_stake_name: string | null; // só para role='guest'
  home_ward_name: string | null;  // só para role='guest'
  is_minor: boolean;
  guardian_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// ─── JWT Claims ──────────────────────────────────────────────────────────────

/**
 * Claims injetados no JWT pelo Auth Hook (DATABASE_SCHEMA.md seção 8).
 * Sempre derivados do banco — nunca aceitos como input do client.
 */
export interface AppMetadataClaims {
  role: UserRole;
  stake_id: string | null;
  ward_id: string | null;
}
