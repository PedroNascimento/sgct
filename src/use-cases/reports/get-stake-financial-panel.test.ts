import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type { StakeFinancialPanelData } from "@/domain/types/report";
import { getStakeFinancialPanel } from "./get-stake-financial-panel";

describe("getStakeFinancialPanel (Spec 015)", () => {
  let mockRepo: jest.Mocked<FinancialReportRepository>;

  const validStakeId = "11111111-1111-4111-8111-111111111111";
  const validCaravanId = "22222222-2222-4222-8222-222222222222";

  const samplePanelData: StakeFinancialPanelData = {
    stakeId: validStakeId,
    stakeName: "Estaca Exemplo",
    caravanId: validCaravanId,
    transfersByWard: [
      {
        wardId: "33333333-3333-4333-8333-333333333333",
        wardName: "Ala A",
        isGuestGroup: false,
        totalDue: 405,
        totalPaidInWard: 135,
        totalTransferredConfirmed: 135,
        totalPendingMember: 135,
        totalRemainingToTransfer: 270,
        countTotalActive: 3,
        countConfirmed: 1,
        countPagoAla: 1,
        countPendingMember: 1,
        countCancelledWithCredit: 0,
      },
      {
        wardId: "convidados",
        wardName: "Outra Estaca",
        isGuestGroup: true,
        totalDue: 135,
        totalPaidInWard: 0,
        totalTransferredConfirmed: 135,
        totalPendingMember: 0,
        totalRemainingToTransfer: 0,
        countTotalActive: 1,
        countConfirmed: 1,
        countPagoAla: 0,
        countPendingMember: 0,
        countCancelledWithCredit: 0,
      },
    ],
    totals: {
      totalDue: 540,
      totalPaidInWard: 135,
      totalTransferredConfirmed: 270,
      totalPendingMember: 135,
      totalRemainingToTransfer: 270,
      countTotalActive: 4,
      countConfirmed: 2,
      countPagoAla: 1,
      countPendingMember: 1,
      countCancelledWithCredit: 0,
    },
    registrants: [
      {
        reservationId: "44444444-4444-4444-8444-444444444444",
        caravanId: validCaravanId,
        caravanDepartureDate: "2026-12-18",
        createdAt: "2026-11-15T12:00:00Z",
        passengerName: "Maria Silva",
        wardId: "33333333-3333-4333-8333-333333333333",
        wardName: "Ala A",
        fundingSource: "membro",
        category: "standard",
        participantType: "adulto",
        paymentAmount: 135,
        status: "confirmado",
        confirmedAt: "2026-11-16T10:00:00Z",
        isGuest: false,
      },
    ],
    credits: [
      {
        creditId: "55555555-5555-4555-8555-555555555555",
        userId: "66666666-6666-4666-8666-666666666666",
        memberName: "João Santos",
        wardId: "33333333-3333-4333-8333-333333333333",
        wardName: "Ala A",
        amount: 135,
        source: "caravan_cancelled",
        status: "active",
        originReservationId: "77777777-7777-4777-8777-777777777777",
        reason: "Cancelamento por falta de quórum",
        expiresAt: "2027-11-15T12:00:00Z",
        usedAt: null,
        createdAt: "2026-11-15T12:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    mockRepo = {
      getWardFinancialData: jest.fn(),
      getStakeFinancialData: jest.fn(),
      getStakeFinancialPanelData: jest.fn().mockResolvedValue(samplePanelData),
      getWardFinancialPanelData: jest.fn(),
    };
  });

  it("retorna os dados consolidados de repasses por Ala, Outra Estaca, inscritos e créditos", async () => {
    const result = await getStakeFinancialPanel(
      { stakeId: validStakeId, caravanId: validCaravanId },
      { repository: mockRepo }
    );

    expect(mockRepo.getStakeFinancialPanelData).toHaveBeenCalledWith(
      validStakeId,
      validCaravanId
    );
    expect(result.transfersByWard).toHaveLength(2);
    expect(result.totals.totalDue).toBe(540);
    expect(result.totals.totalTransferredConfirmed).toBe(270);
    expect(result.totals.totalRemainingToTransfer).toBe(270);
    expect(result.credits).toHaveLength(1);
  });

  it("permite consultar sem caravanId específico", async () => {
    await getStakeFinancialPanel(
      { stakeId: validStakeId },
      { repository: mockRepo }
    );

    expect(mockRepo.getStakeFinancialPanelData).toHaveBeenCalledWith(
      validStakeId,
      undefined
    );
  });

  it("rejeita stakeId inválido via Zod", async () => {
    await expect(
      getStakeFinancialPanel({ stakeId: "invalido" }, { repository: mockRepo })
    ).rejects.toThrow();
    expect(mockRepo.getStakeFinancialPanelData).not.toHaveBeenCalled();
  });

  it("rejeita caravanId inválido via Zod", async () => {
    await expect(
      getStakeFinancialPanel(
        { stakeId: validStakeId, caravanId: "nao-uuid" },
        { repository: mockRepo }
      )
    ).rejects.toThrow();
    expect(mockRepo.getStakeFinancialPanelData).not.toHaveBeenCalled();
  });
});
