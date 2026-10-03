/**
 * Tipo de domínio Ward (Ala).
 * Artigo I da Constituição: camada domain/ pura sem frameworks.
 */

export interface Ward {
  id: string;
  stake_id: string;
  name: string;
  created_at: string;
}

export interface WardWithStats extends Ward {
  member_count?: number;
  admin_count?: number;
}

