/**
 * Regra de precificação de caravanas (D33) — domínio puro.
 *
 * - Sem pernoite: total = passagem (alojamento = 0).
 * - Com pernoite: total = passagem + alojamento.
 * - Oficiante: 50% de desconto SOMENTE no alojamento; passagem integral.
 *
 * Espelha o trigger `compute_caravan_prices` do banco (fonte de verdade na persistência).
 */

export const OFFICIANT_LODGING_DISCOUNT = 0.5;

/** Valores sugeridos (editáveis pelo Admin da Estaca a cada caravana). */
export const SUGGESTED_PRICING = {
  withoutOvernight: { ticket: 100, lodging: 0 },
  withOvernight: { ticket: 109, lodging: 26 },
} as const;

export interface CaravanPricingInput {
  overnight: boolean;
  priceTicket: number;
  priceLodging: number;
}

export interface CaravanPrices {
  priceTicket: number;
  priceLodging: number;
  priceStandard: number;
  priceOfficiant: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateCaravanPrices(input: CaravanPricingInput): CaravanPrices {
  const priceTicket = round2(input.priceTicket);
  const priceLodging = input.overnight ? round2(input.priceLodging) : 0;
  return {
    priceTicket,
    priceLodging,
    priceStandard: round2(priceTicket + priceLodging),
    priceOfficiant: round2(priceTicket + priceLodging * (1 - OFFICIANT_LODGING_DISCOUNT)),
  };
}
