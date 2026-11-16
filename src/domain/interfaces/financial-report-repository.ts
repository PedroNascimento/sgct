/**
 * Interface do repositório para dados de relatórios financeiros (Spec 009).
 * Artigo I: desacoplamento de infraestrutura.
 */

import type {
  WardFinancialSummary,
  StakeFinancialSummary,
  StakeFinancialPanelData,
  WardFinancialPanelData,
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

  getStakeFinancialPanelData(
    stakeId: string,
    caravanId?: string
  ): Promise<StakeFinancialPanelData>;

  getWardFinancialPanelData(
    stakeId: string,
    wardId: string,
    caravanId?: string
  ): Promise<WardFinancialPanelData>;
}
