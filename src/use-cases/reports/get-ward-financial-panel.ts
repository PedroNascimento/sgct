/**
 * Use-case: Consultar Painel Financeiro de Repasses e Créditos da Ala (Spec 015 / D34).
 * Artigo I: regra de negócio pura em use-cases/.
 * Artigo II: isolado estritamente por stakeId e wardId.
 * Artigo V: validação com Zod.
 */

import { z } from "zod";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type { WardFinancialPanelData } from "@/domain/types/report";

export const GetWardFinancialPanelSchema = z.object({
  stakeId: z.string().uuid("stakeId deve ser um UUID válido"),
  wardId: z.string().uuid("wardId deve ser um UUID válido"),
  caravanId: z.string().uuid("caravanId deve ser um UUID válido").optional(),
});

export type GetWardFinancialPanelInput = z.infer<
  typeof GetWardFinancialPanelSchema
>;

export interface GetWardFinancialPanelDependencies {
  repository: FinancialReportRepository;
}

export async function getWardFinancialPanel(
  input: GetWardFinancialPanelInput,
  deps: GetWardFinancialPanelDependencies
): Promise<WardFinancialPanelData> {
  const validated = GetWardFinancialPanelSchema.parse(input);
  return deps.repository.getWardFinancialPanelData(
    validated.stakeId,
    validated.wardId,
    validated.caravanId
  );
}
