/**
 * Use-case: Consultar Painel Financeiro Consolidado de Repasses e Créditos da Estaca (Spec 015 / D34).
 * Artigo I: regra de negócio pura em use-cases/.
 * Artigo II: escopado estritamente por stakeId.
 * Artigo V: validação com Zod.
 */

import { z } from "zod";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type { StakeFinancialPanelData } from "@/domain/types/report";

export const GetStakeFinancialPanelSchema = z.object({
  stakeId: z.string().uuid("stakeId deve ser um UUID válido"),
  caravanId: z.string().uuid("caravanId deve ser um UUID válido").optional(),
});

export type GetStakeFinancialPanelInput = z.infer<
  typeof GetStakeFinancialPanelSchema
>;

export interface GetStakeFinancialPanelDependencies {
  repository: FinancialReportRepository;
}

export async function getStakeFinancialPanel(
  input: GetStakeFinancialPanelInput,
  deps: GetStakeFinancialPanelDependencies
): Promise<StakeFinancialPanelData> {
  const validated = GetStakeFinancialPanelSchema.parse(input);
  return deps.repository.getStakeFinancialPanelData(
    validated.stakeId,
    validated.caravanId
  );
}
