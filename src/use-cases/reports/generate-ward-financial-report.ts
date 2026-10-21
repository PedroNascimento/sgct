/**
 * Use-case: Gerar Relatório Financeiro por Ala (Spec 009 / T009.1 / T009.3 / US-009.1).
 * Artigo I: regra de negócio pura em use-cases/.
 * Artigo II: isolado estritamente por wardId/stakeId.
 * Artigo V: validação com Zod.
 */

import { z } from "zod";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import { buildSimplePdf } from "./simple-pdf-builder";

export const GenerateWardFinancialReportSchema = z.object({
  wardId: z.string().uuid("wardId deve ser um UUID válido"),
  caravanId: z.string().uuid().optional(),
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export type GenerateWardFinancialReportInput = z.infer<
  typeof GenerateWardFinancialReportSchema
>;

export interface GenerateWardFinancialReportDependencies {
  repository: FinancialReportRepository;
}

export async function generateWardFinancialReport(
  input: GenerateWardFinancialReportInput,
  deps: GenerateWardFinancialReportDependencies
): Promise<Buffer> {
  const validated = GenerateWardFinancialReportSchema.parse(input);
  const data = await deps.repository.getWardFinancialData(
    validated.wardId,
    validated.caravanId
  );

  if (validated.format === "csv") {
    const lines: string[] = [];
    // BOM UTF-8 para compatibilidade com Microsoft Excel
    lines.push("\uFEFFRelatório Financeiro da Ala");
    lines.push(`Ala: ${data.wardName}`);
    lines.push(
      `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`
    );
    lines.push("");
    lines.push("Data da Caravana;Passageiro;Tipo;Categoria;Valor;Status");

    for (const row of data.rows) {
      lines.push(
        `${row.caravanDepartureDate};${row.passengerName};${row.participantType};${row.category};${row.paymentAmount.toFixed(2)};${row.status}`
      );
    }

    lines.push("");
    lines.push(`Total Confirmados;${data.totalConfirmed}`);
    lines.push(`Total Pago Ala (em validacao);${data.totalPagoAla}`);
    lines.push(`Total Pagamento Pendente;${data.totalPendente}`);
    lines.push(`Total Arrecadado (R$);${data.totalCollected.toFixed(2)}`);

    return Buffer.from(lines.join("\n"), "utf-8");
  }

  // Formato PDF
  const pdfLines: string[] = [
    `Ala: ${data.wardName}`,
    `Data de emissao: ${new Date().toLocaleDateString("pt-BR")}`,
    "--------------------------------------------------------------------------------",
    "Passageiro | Caravana | Categoria | Valor | Status",
    "--------------------------------------------------------------------------------",
  ];

  for (const row of data.rows) {
    pdfLines.push(
      `${row.passengerName.padEnd(25)} | ${row.caravanDepartureDate} | ${row.category.padEnd(10)} | R$ ${row.paymentAmount.toFixed(2).padStart(8)} | ${row.status}`
    );
  }

  pdfLines.push("--------------------------------------------------------------------------------");
  pdfLines.push(`Total Confirmados: ${data.totalConfirmed}`);
  pdfLines.push(`Total Pago na Ala: ${data.totalPagoAla}`);
  pdfLines.push(`Total Pendente: ${data.totalPendente}`);
  pdfLines.push(`TOTAL ARRECADADO: R$ ${data.totalCollected.toFixed(2)}`);

  return buildSimplePdf(`Relatorio Financeiro - ${data.wardName}`, pdfLines);
}
