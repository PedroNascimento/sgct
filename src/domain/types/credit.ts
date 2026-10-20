/**
 * Tipos de domínio para Crédito e Credit Ledger (Spec 005 / US-005.1 e US-005.3).
 * Artigo I: camada domain pura, sem frameworks.
 */

export type CreditSource =
  | "waitlist_promotion"
  | "caravan_cancelled"
  | "exceptional_grant";

export type CreditStatus = "active" | "used" | "expired";

export interface CreditLedgerEntry {
  id: string;
  stake_id: string;
  ward_id: string;
  user_id: string;
  amount: number;
  source: CreditSource;
  origin_reservation_id: string | null;
  granted_by: string | null;
  reason: string | null;
  expires_at: string;
  used_at: string | null;
  status: CreditStatus;
  created_at: string;
}
