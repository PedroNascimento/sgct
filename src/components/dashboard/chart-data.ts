/** Paleta alinhada ao design system do SGCT. */
export const CHART_COLORS = {
  brand: "#006184",
  brandLight: "#7fb9cf",
  success: "#1f8a5b",
  warning: "#d98a1c",
  waitlist: "#6b7fd7",
  neutral: "#9aa0a6",
  grid: "#e0e2e2",
  text: "#53575b",
} as const;

export interface StatusSlice {
  name: string;
  value: number;
  color: string;
}
export interface WardBar {
  ward: string;
  confirmados: number;
  pagoAla: number;
  pendentes: number;
  espera: number;
}
export interface TimelinePoint {
  date: string;
  inscricoes: number;
  acumulado: number;
}
export interface RevenueBar {
  name: string;
  valor: number;
  color: string;
}
