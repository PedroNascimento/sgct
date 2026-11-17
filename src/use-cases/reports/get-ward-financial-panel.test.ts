import type { FinancialReportRepository } from "@/domain/interfaces/financial-report-repository";
import type { WardFinancialPanelData } from "@/domain/types/report";
import { getWardFinancialPanel } from "./get-ward-financial-panel";

describe("getWardFinancialPanel (Spec 015)", () => {
  let mockRepo: jest.Mocked<FinancialReportRepository>;

  const validStakeId = "11111111-1111-4111-8111-111111111111";
  const validWardId = "33333333-3333-4333-8333-333333333333";
  const validCaravanId = "22222222-2222-4222-8222-222222222222";

  const sampleWardPanel: WardFinancialPanelData = {
    stakeId: validStakeId,
    wardId: validWardId,
    wardName: "Ala A",
    caravanId: validCaravanId,
    summary: {
      wardId: validWardId,
      wardName: "Ala A",
      isGuestGroup: false,
      totalDue: 270,
      totalPaidInWard: 135,
      totalTransferredConfirmed: 135,
      totalPendingMember: 0,
      totalRemainingToTransfer: 135,
      countTotalActive: 2,
      countConfirmed: 1,
      countPagoAla: 1,
      countPendingMember: 0,
      countCancelledWithCredit: 1,
    },
    registrants: [
      {
        reservationId: "44444444-4444-4444-8444-444444444444",
        caravanId: validCaravanId,
        caravanDepartureDate: "2026-12-18",
        createdAt: "2026-11-15T12:00:00Z",
        passengerName: "Maria Silva",
        wardId: validWardId,
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
        memberName: "Ana Costa",
        wardId: validWardId,
        wardName: "Ala A",
        amount: 135,
        source: "waitlist_promotion",
        status: "active",
        originReservationId: "88888888-8888-4888-8888-888888888888",
        reason: null,
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
      getStakeFinancialPanelData: jest.fn(),
      getWardFinancialPanelData: jest.fn().mockResolvedValue(sampleWardPanel),
    };
  });

  it("retorna os dados financeiros escopados à Ala e Estaca informadas", async () => {
    const result = await getWardFinancialPanel(
      { stakeId: validStakeId, wardId: validWardId, caravanId: validCaravanId },
      { repository: mockRepo }
    );

    expect(mockRepo.getWardFinancialPanelData).toHaveBeenCalledWith(
      validStakeId,
      validWardId,
      validCaravanId
    );
    expect(result.wardId).toBe(validWardId);
    expect(result.summary.totalDue).toBe(270);
    expect(result.summary.totalRemainingToTransfer).toBe(135);
    expect(result.registrants).toHaveLength(1);
    expect(result.credits).toHaveLength(1);
  });

  it("rejeita stakeId ou wardId inválidos via Zod", async () => {
    await expect(
      getWardFinancialPanel(
        { stakeId: "invalido", wardId: validWardId },
        { repository: mockRepo }
      )
    ).rejects.toThrow();

    await expect(
      getWardFinancialPanel(
        { stakeId: validStakeId, wardId: "invalido" },
        { repository: mockRepo }
      )
    ).rejects.toThrow();

    expect(mockRepo.getWardFinancialPanelData).not.toHaveBeenCalled();
  });
});
