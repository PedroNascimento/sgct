/**
 * Use-case: Gerar Relatório Financeiro Consolidado da Estaca (Spec 009 / T009.2 / T009.3 / US-009.2).
 * Artigo I: regra de negócio pura em use-cases/.
 * Artigo II: consolidado escopado estritamente por stakeId (nunca vaza entre Estacas).
 * Artigo V: validação com Zod.
 */

import { z } from "zod";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import { buildSimplePdf } from "./simple-pdf-builder";

export const GenerateStakeFinancialReportSchema = z.object({
  stakeId: z.string().uuid("stakeId deve ser um UUID válido"),
  caravanId: z.string().uuid().optional(),
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export type GenerateStakeFinancialReportInput = z.infer<
  typeof GenerateStakeFinancialReportSchema
>;

export interface GenerateStakeFinancialReportDependencies {
  repository: FinancialReportRepository;
}

export async function generateStakeFinancialReport(
  input: GenerateStakeFinancialReportInput,
  deps: GenerateStakeFinancialReportDependencies
): Promise<Buffer> {
  const validated = GenerateStakeFinancialReportSchema.parse(input);
  const data = await deps.repository.getStakeFinancialData(
    validated.stakeId,
    validated.caravanId
  );

  if (validated.format === "csv") {
    const lines: string[] = [];
    lines.push("\uFEFFRelatório Financeiro Consolidado da Estaca");
    lines.push(`Estaca: ${data.stakeName}`);
    lines.push(
      `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`
    );
    lines.push("");
    lines.push("Ala;Confirmados;Pago na Ala;Pendente;Total Arrecadado (R$)");

    for (const ward of data.byWard) {
      lines.push(
        `${ward.wardName};${ward.totalConfirmed};${ward.totalPagoAla};${ward.totalPendente};${ward.totalCollected.toFixed(2)}`
      );
    }

    lines.push("");
    lines.push(
      `TOTAL GERAL;${data.totalConfirmed};${data.totalPagoAla};${data.totalPendente};${data.totalCollected.toFixed(2)}`
    );

    return Buffer.from(lines.join("\n"), "utf-8");
  }

  // Formato PDF
  const pdfLines: string[] = [
    `Estaca: ${data.stakeName}`,
    `Data de emissao: ${new Date().toLocaleDateString("pt-BR")}`,
    "--------------------------------------------------------------------------------",
    "Ala | Confirmados | Pago Ala | Pendente | Total Arrecadado",
    "--------------------------------------------------------------------------------",
  ];

  for (const ward of data.byWard) {
    pdfLines.push(
      `${ward.wardName.padEnd(25)} | ${String(ward.totalConfirmed).padStart(11)} | ${String(ward.totalPagoAla).padStart(8)} | ${String(ward.totalPendente).padStart(8)} | R$ ${ward.totalCollected.toFixed(2).padStart(12)}`
    );
  }

  pdfLines.push("--------------------------------------------------------------------------------");
  pdfLines.push(
    `TOTAL CONSOLIDADO: ${data.totalConfirmed} confirmados | R$ ${data.totalCollected.toFixed(2)} arrecadados`
  );

  return buildSimplePdf(`Relatorio Consolidado - ${data.stakeName}`, pdfLines);
}
