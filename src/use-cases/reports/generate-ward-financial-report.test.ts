import { generateWardFinancialReport } from "./generate-ward-financial-report";
import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type { WardFinancialSummary } from "@/domain/types/report";

describe("generateWardFinancialReport (T009.1 / T009.3)", () => {
  let mockRepo: jest.Mocked<FinancialReportRepository>;

  const mockWardData: WardFinancialSummary = {
    stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
    wardId: "7b4ac10b-58cc-4372-a567-0e02b2c3d479",
    wardName: "Ala Sul",
    totalConfirmed: 2,
    totalPagoAla: 1,
    totalPendente: 1,
    totalCollected: 390.0,
    rows: [
      {
        reservationId: "res-1",
        caravanDepartureDate: "2026-11-20",
        passengerName: "Pedro Silva",
        participantType: "adulto",
        category: "standard",
        paymentAmount: 130.0,
        status: "confirmado",
      },
      {
        reservationId: "res-2",
        caravanDepartureDate: "2026-11-20",
        passengerName: "Maria Souza",
        participantType: "oficiante",
        category: "officiant",
        paymentAmount: 117.0,
        status: "confirmado",
      },
      {
        reservationId: "res-3",
        caravanDepartureDate: "2026-11-20",
        passengerName: "Lucas Lima",
        participantType: "adulto",
        category: "standard",
        paymentAmount: 130.0,
        status: "pago_ala",
      },
    ],
  };

  beforeEach(() => {
    mockRepo = {
      getWardFinancialData: jest.fn().mockResolvedValue(mockWardData),
      getStakeFinancialData: jest.fn(),
    };
  });

  it("gera relatório em CSV com dados da Ala e cabeçalhos corretos", async () => {
    const result = await generateWardFinancialReport(
      {
        wardId: "7b4ac10b-58cc-4372-a567-0e02b2c3d479",
        format: "csv",
      },
      { repository: mockRepo }
    );

    const csvContent = result.toString("utf-8");

    expect(mockRepo.getWardFinancialData).toHaveBeenCalledWith(
      "7b4ac10b-58cc-4372-a567-0e02b2c3d479",
      undefined
    );
    expect(csvContent).toContain("Ala Sul");
    expect(csvContent).toContain("Pedro Silva");
    expect(csvContent).toContain("Maria Souza");
    expect(csvContent).toContain("390.00");
    expect(csvContent).toContain("Data da Caravana;Passageiro;Tipo;Categoria;Valor;Status");
  });

  it("gera relatório em formato PDF com dados estruturados", async () => {
    const result = await generateWardFinancialReport(
      {
        wardId: "7b4ac10b-58cc-4372-a567-0e02b2c3d479",
        format: "pdf",
      },
      { repository: mockRepo }
    );

    // O arquivo PDF começa com a assinatura %PDF-
    expect(result.toString("utf-8", 0, 5)).toBe("%PDF-");
    expect(result.length).toBeGreaterThan(100);
  });

  it("rejeita chamada sem wardId válido", async () => {
    await expect(
      generateWardFinancialReport(
        { wardId: "invalido", format: "csv" },
        { repository: mockRepo }
      )
    ).rejects.toThrow();
  });

  it("neutraliza payload de fórmula maliciosa em dados de passageiro no CSV (M02)", async () => {
    mockRepo.getWardFinancialData.mockResolvedValueOnce({
      ...mockWardData,
      rows: [
        {
          reservationId: "res-malicious",
          caravanDepartureDate: "2026-11-20",
          passengerName: "=cmd|' /C calc'!A0",
          participantType: "+adulto",
          category: "@standard",
          paymentAmount: 130.0,
          status: "-confirmado",
        },
      ],
    });

    const result = await generateWardFinancialReport(
      {
        wardId: "7b4ac10b-58cc-4372-a567-0e02b2c3d479",
        format: "csv",
      },
      { repository: mockRepo }
    );

    const csvContent = result.toString("utf-8");
    expect(csvContent).toContain("\"'=cmd|' /C calc'!A0\"");
    expect(csvContent).toContain("\"'+adulto\"");
    expect(csvContent).toContain("\"'@standard\"");
    expect(csvContent).toContain("\"'-confirmado\"");
  });
});
