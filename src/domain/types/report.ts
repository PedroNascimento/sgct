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
