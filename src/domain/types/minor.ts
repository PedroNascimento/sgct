/**
 * Tipos de domínio para Menores e Formulários de Autorização (Spec 006 / US-006.3 / D07).
 * Artigo I da Constituição: camada domain/ pura, sem frameworks.
 */

export type MinorFormStatus = "pending" | "approved" | "rejected";

export interface MinorApprovalForm {
  id: string;
  stake_id: string;
  ward_id: string;
  reservation_id: string;
  storage_path: string;
  status: MinorFormStatus;
  approved_by: string | null;
  approved_at: string | null;
}
