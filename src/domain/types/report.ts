/**
 * Tipos de domínio para Relatórios Financeiros (Spec 009 / D19).
 * Artigo I: camada domain/ pura, sem frameworks.
 */

export interface WardFinancialReportRow {
  reservationId: string;
  caravanDepartureDate: string;
  passengerName: string;
  participantType: string;
  category: string;
  paymentAmount: number;
  status: string;
}

export interface WardFinancialSummary {
  stakeId: string;
  wardId: string;
  wardName: string;
  totalConfirmed: number;
  totalPagoAla: number;
  totalPendente: number;
  totalCollected: number;
  rows: WardFinancialReportRow[];
}

export interface StakeWardSummaryRow {
  wardId: string;
  wardName: string;
  totalConfirmed: number;
  totalPagoAla: number;
  totalPendente: number;
  totalCollected: number;
}

export interface StakeFinancialSummary {
  stakeId: string;
  stakeName: string;
  byWard: StakeWardSummaryRow[];
  totalConfirmed: number;
  totalPagoAla: number;
  totalPendente: number;
  totalCollected: number;
}

/**
 * Resumo financeiro de repasses por Ala (ou "Outra Estaca") — Spec 015 / D34.
 */
export interface WardTransferSummary {
  wardId: string;
  wardName: string;
  isGuestGroup: boolean;
  totalDue: number;
  totalPaidInWard: number;
  totalTransferredConfirmed: number;
  totalPendingMember: number;
  totalRemainingToTransfer: number;
  countTotalActive: number;
  countConfirmed: number;
  countPagoAla: number;
  countPendingMember: number;
  countCancelledWithCredit: number;
}

export interface FinancialRegistrantRow {
  reservationId: string;
  caravanId: string;
  caravanDepartureDate: string;
  createdAt: string;
  passengerName: string;
  wardId: string | null;
  wardName: string;
  originLabel?: string;
  fundingSource: string;
  category: string;
  participantType: string;
  paymentAmount: number;
  status: string;
  confirmedAt: string | null;
  isGuest: boolean;
}

export interface FinancialCreditRow {
  creditId: string;
  userId: string;
  memberName: string;
  wardId: string | null;
  wardName: string;
  amount: number;
  source: string;
  status: string;
  originReservationId: string | null;
  reason: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface StakeFinancialPanelTotals {
  totalDue: number;
  totalPaidInWard: number;
  totalTransferredConfirmed: number;
  totalPendingMember: number;
  totalRemainingToTransfer: number;
  countTotalActive: number;
  countConfirmed: number;
  countPagoAla: number;
  countPendingMember: number;
  countCancelledWithCredit: number;
}

export interface StakeFinancialPanelData {
  stakeId: string;
  stakeName: string;
  caravanId?: string;
  transfersByWard: WardTransferSummary[];
  totals: StakeFinancialPanelTotals;
  registrants: FinancialRegistrantRow[];
  credits: FinancialCreditRow[];
}

export interface WardFinancialPanelData {
  stakeId: string;
  wardId: string;
  wardName: string;
  caravanId?: string;
  summary: WardTransferSummary;
  registrants: FinancialRegistrantRow[];
  credits: FinancialCreditRow[];
}
