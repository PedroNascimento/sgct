import {
  buildWardTransferSummary,
  sumWardTransferSummaries,
  formatFundingSourceLabel,
  formatCreditSourceLabel,
} from "./transfer-summary";
import type { FinancialRegistrantRow } from "@/domain/types/report";

function makeRow(overrides: Partial<FinancialRegistrantRow>): FinancialRegistrantRow {
  return {
    reservationId: "r-1",
    caravanId: "c-1",
    caravanDepartureDate: "2026-12-18",
    createdAt: "2026-11-15T12:00:00Z",
    passengerName: "Membro Teste",
    wardId: "w-1",
    wardName: "Ala Teste",
    fundingSource: "membro",
    category: "standard",
    participantType: "adulto",
    paymentAmount: 135,
    status: "pendente",
    confirmedAt: null,
    isGuest: false,
    ...overrides,
  };
}

describe("transfer-summary (Spec 015)", () => {
  it("calcula corretamente totalDue, totalPaidInWard, totalTransferredConfirmed, totalPendingMember e totalRemainingToTransfer", () => {
    const rows: FinancialRegistrantRow[] = [
      makeRow({ reservationId: "1", status: "confirmado", paymentAmount: 135 }),
      makeRow({ reservationId: "2", status: "presente", paymentAmount: 122 }),
      makeRow({ reservationId: "3", status: "pago_ala", paymentAmount: 135 }),
      makeRow({ reservationId: "4", status: "pendente", paymentAmount: 135 }),
      makeRow({ reservationId: "5", status: "aguardando_auxilio", paymentAmount: 135 }),
      makeRow({ reservationId: "6", status: "cancelada_com_credito", paymentAmount: 135 }),
      makeRow({ reservationId: "7", status: "expirada", paymentAmount: 135 }),
      makeRow({ reservationId: "8", status: "lista_espera", paymentAmount: 135 }),
    ];

    const summary = buildWardTransferSummary("w-1", "Ala Teste", false, rows);

    expect(summary.totalTransferredConfirmed).toBe(257); // 135 + 122
    expect(summary.totalPaidInWard).toBe(135);
    expect(summary.totalPendingMember).toBe(270); // 135 + 135
    expect(summary.totalDue).toBe(662); // 257 + 135 + 270
    expect(summary.totalRemainingToTransfer).toBe(405); // 662 - 257
    expect(summary.countTotalActive).toBe(5);
    expect(summary.countConfirmed).toBe(2);
    expect(summary.countPagoAla).toBe(1);
    expect(summary.countPendingMember).toBe(2);
    expect(summary.countCancelledWithCredit).toBe(1);
  });

  it("soma corretamente os totais da Estaca", () => {
    const s1 = buildWardTransferSummary("w-1", "Ala 1", false, [
      makeRow({ status: "confirmado", paymentAmount: 135 }),
      makeRow({ status: "pago_ala", paymentAmount: 135 }),
    ]);
    const s2 = buildWardTransferSummary("convidados", "Outra Estaca", true, [
      makeRow({ status: "aguardando_transferencia_interestaca", paymentAmount: 122, isGuest: true }),
    ]);

    const totals = sumWardTransferSummaries([s1, s2]);
    expect(totals.totalDue).toBe(392);
    expect(totals.totalTransferredConfirmed).toBe(135);
    expect(totals.totalPaidInWard).toBe(135);
    expect(totals.totalPendingMember).toBe(122);
    expect(totals.totalRemainingToTransfer).toBe(257);
    expect(totals.countTotalActive).toBe(3);
  });

  it("formata rótulos de forma de pagamento e origem de crédito", () => {
    expect(formatFundingSourceLabel("membro")).toBe("Pagamento com Recursos do Membro");
    expect(formatFundingSourceLabel("convidado_transferencia_interestaca")).toBe(
      "Transferência Inter-Estaca"
    );
    expect(formatCreditSourceLabel("caravan_cancelled")).toBe("Cancelamento de Caravana");
    expect(formatCreditSourceLabel("waitlist_promotion")).toBe("Lista de Espera");
  });
});
