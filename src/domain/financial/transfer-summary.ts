/**
 * Helpers puros de cálculo de repasses e formatação financeira (Spec 015 / D34).
 * Artigo I: camada domain/ pura, sem frameworks.
 */

import type {
  FinancialRegistrantRow,
  StakeFinancialPanelTotals,
  WardTransferSummary,
} from "@/domain/types/report";

const CONFIRMED_STATUSES = new Set(["confirmado", "presente"]);
const PAID_IN_WARD_STATUSES = new Set(["pago_ala"]);
const PENDING_MEMBER_STATUSES = new Set([
  "pendente",
  "aguardando_auxilio",
  "aguardando_transferencia_interestaca",
]);

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildWardTransferSummary(
  wardId: string,
  wardName: string,
  isGuestGroup: boolean,
  rows: FinancialRegistrantRow[]
): WardTransferSummary {
  let totalTransferredConfirmed = 0;
  let totalPaidInWard = 0;
  let totalPendingMember = 0;
  let countTotalActive = 0;
  let countConfirmed = 0;
  let countPagoAla = 0;
  let countPendingMember = 0;
  let countCancelledWithCredit = 0;

  for (const row of rows) {
    const amount = Number(row.paymentAmount || 0);
    if (CONFIRMED_STATUSES.has(row.status)) {
      totalTransferredConfirmed += amount;
      countConfirmed++;
      countTotalActive++;
    } else if (PAID_IN_WARD_STATUSES.has(row.status)) {
      totalPaidInWard += amount;
      countPagoAla++;
      countTotalActive++;
    } else if (PENDING_MEMBER_STATUSES.has(row.status)) {
      totalPendingMember += amount;
      countPendingMember++;
      countTotalActive++;
    } else if (row.status === "cancelada_com_credito") {
      countCancelledWithCredit++;
    }
  }

  const totalDue = roundCurrency(
    totalTransferredConfirmed + totalPaidInWard + totalPendingMember
  );
  const roundedConfirmed = roundCurrency(totalTransferredConfirmed);
  const roundedPaidInWard = roundCurrency(totalPaidInWard);
  const roundedPending = roundCurrency(totalPendingMember);
  const totalRemainingToTransfer = roundCurrency(totalDue - roundedConfirmed);

  return {
    wardId,
    wardName,
    isGuestGroup,
    totalDue,
    totalPaidInWard: roundedPaidInWard,
    totalTransferredConfirmed: roundedConfirmed,
    totalPendingMember: roundedPending,
    totalRemainingToTransfer,
    countTotalActive,
    countConfirmed,
    countPagoAla,
    countPendingMember,
    countCancelledWithCredit,
  };
}

export function sumWardTransferSummaries(
  summaries: WardTransferSummary[]
): StakeFinancialPanelTotals {
  const totals = summaries.reduce<StakeFinancialPanelTotals>(
    (acc, item) => ({
      totalDue: acc.totalDue + item.totalDue,
      totalPaidInWard: acc.totalPaidInWard + item.totalPaidInWard,
      totalTransferredConfirmed:
        acc.totalTransferredConfirmed + item.totalTransferredConfirmed,
      totalPendingMember: acc.totalPendingMember + item.totalPendingMember,
      totalRemainingToTransfer:
        acc.totalRemainingToTransfer + item.totalRemainingToTransfer,
      countTotalActive: acc.countTotalActive + item.countTotalActive,
      countConfirmed: acc.countConfirmed + item.countConfirmed,
      countPagoAla: acc.countPagoAla + item.countPagoAla,
      countPendingMember: acc.countPendingMember + item.countPendingMember,
      countCancelledWithCredit:
        acc.countCancelledWithCredit + item.countCancelledWithCredit,
    }),
    {
      totalDue: 0,
      totalPaidInWard: 0,
      totalTransferredConfirmed: 0,
      totalPendingMember: 0,
      totalRemainingToTransfer: 0,
      countTotalActive: 0,
      countConfirmed: 0,
      countPagoAla: 0,
      countPendingMember: 0,
      countCancelledWithCredit: 0,
    }
  );

  return {
    ...totals,
    totalDue: roundCurrency(totals.totalDue),
    totalPaidInWard: roundCurrency(totals.totalPaidInWard),
    totalTransferredConfirmed: roundCurrency(totals.totalTransferredConfirmed),
    totalPendingMember: roundCurrency(totals.totalPendingMember),
    totalRemainingToTransfer: roundCurrency(totals.totalRemainingToTransfer),
  };
}

const FUNDING_SOURCE_LABELS: Record<string, string> = {
  membro: "Pagamento com Recursos do Membro",
  auxilio_area_investidura: "Auxílio Área — Investidura",
  auxilio_recem_converso: "Auxílio Recém-Converso",
  auxilio_estaca_fundo_reserva: "Auxílio Estaca — Fundo de Reserva",
  convidado_transferencia_interestaca: "Transferência Inter-Estaca",
};

export function formatFundingSourceLabel(fundingSource: string): string {
  return FUNDING_SOURCE_LABELS[fundingSource] ?? fundingSource;
}

const CREDIT_SOURCE_LABELS: Record<string, string> = {
  waitlist_promotion: "Lista de Espera",
  caravan_cancelled: "Cancelamento de Caravana",
  exceptional_grant: "Concessão Excepcional",
};

export function formatCreditSourceLabel(source: string): string {
  return CREDIT_SOURCE_LABELS[source] ?? source;
}
