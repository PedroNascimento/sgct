import { generateStakeFinancialReport } from "./generate-stake-financial-report";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type { StakeFinancialSummary } from "@/domain/types/report";

describe("generateStakeFinancialReport (T009.2 / T009.3)", () => {
  let mockRepo: jest.Mocked<FinancialReportRepository>;

  const mockStakeData: StakeFinancialSummary = {
    stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
    stakeName: "Estaca Natal",
    totalConfirmed: 45,
    totalPagoAla: 5,
    totalPendente: 2,
    totalCollected: 6500.0,
    byWard: [
      {
        wardId: "ward-1",
        wardName: "Ala Neópolis",
        totalConfirmed: 15,
        totalPagoAla: 2,
        totalPendente: 0,
        totalCollected: 2150.0,
      },
      {
        wardId: "ward-2",
        wardName: "Ala Ponta Negra",
        totalConfirmed: 12,
        totalPagoAla: 1,
        totalPendente: 1,
        totalCollected: 1690.0,
      },
      {
        wardId: "ward-3",
        wardName: "Ala Candelária",
        totalConfirmed: 18,
        totalPagoAla: 2,
        totalPendente: 1,
        totalCollected: 2660.0,
      },
    ],
  };

  beforeEach(() => {
    mockRepo = {
      getWardFinancialData: jest.fn(),
      getStakeFinancialData: jest.fn().mockResolvedValue(mockStakeData),
    };
  });

  it("gera relatório consolidado da Estaca em CSV com consolidação por Ala", async () => {
    const result = await generateStakeFinancialReport(
      {
        stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
        format: "csv",
      },
      { repository: mockRepo }
    );

    const csvContent = result.toString("utf-8");

    expect(mockRepo.getStakeFinancialData).toHaveBeenCalledWith(
      "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
      undefined
    );
    expect(csvContent).toContain("Estaca Natal");
    expect(csvContent).toContain("Ala Neópolis");
    expect(csvContent).toContain("Ala Ponta Negra");
    expect(csvContent).toContain("Ala Candelária");
    expect(csvContent).toContain("TOTAL GERAL;45;5;2;6500.00");
  });

  it("gera relatório consolidado da Estaca em PDF", async () => {
    const result = await generateStakeFinancialReport(
      {
        stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
        format: "pdf",
      },
      { repository: mockRepo }
    );

    expect(result.toString("utf-8", 0, 5)).toBe("%PDF-");
    expect(result.length).toBeGreaterThan(100);
  });

  it("rejeita chamada sem stakeId válido", async () => {
    await expect(
      generateStakeFinancialReport(
        { stakeId: "invalido", format: "csv" },
        { repository: mockRepo }
      )
    ).rejects.toThrow();
  });
});
