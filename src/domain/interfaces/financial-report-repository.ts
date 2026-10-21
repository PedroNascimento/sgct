/**
 * Interface do repositório para dados de relatórios financeiros (Spec 009).
 * Artigo I: desacoplamento de infraestrutura.
 */

import type {
  WardFinancialSummary,
  StakeFinancialSummary,
} from "@/domain/types/report";

export interface FinancialReportRepository {
  getWardFinancialData(
    wardId: string,
    caravanId?: string
  ): Promise<WardFinancialSummary>;

  getStakeFinancialData(
    stakeId: string,
    caravanId?: string
  ): Promise<StakeFinancialSummary>;
}
