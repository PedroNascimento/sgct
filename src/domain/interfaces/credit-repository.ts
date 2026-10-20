/**
 * Interface do repositório de Créditos (credit_ledger).
 * Artigo I: desacopla use-cases de infraestrutura e banco de dados.
 */

import type { CreditLedgerEntry, CreditSource, CreditStatus } from "@/domain/types/credit";

export interface CreateCreditEntryData {
  stake_id?: string;
  ward_id?: string;
  user_id: string;
  amount: number;
  source: CreditSource;
  origin_reservation_id?: string | null;
  granted_by?: string | null;
  reason?: string | null;
  expires_at: string;
  status?: CreditStatus;
}

export interface CreditRepository {
  create(data: CreateCreditEntryData): Promise<CreditLedgerEntry>;
  findById(id: string): Promise<CreditLedgerEntry | null>;
  findByUserId(userId: string): Promise<CreditLedgerEntry[]>;
  findActiveByUserId(userId: string): Promise<CreditLedgerEntry[]>;
  findExpiredActive(currentDate: string): Promise<CreditLedgerEntry[]>;
  updateStatus(id: string, status: CreditStatus, usedAt?: string | null): Promise<CreditLedgerEntry>;
}
