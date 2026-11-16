import { calculateCaravanPrices } from "@/domain/pricing/caravan-pricing";

describe("calculateCaravanPrices (D33)", () => {
  it("sem pernoite: total = passagem e oficiante paga o mesmo", () => {
    const r = calculateCaravanPrices({ overnight: false, priceTicket: 100, priceLodging: 0 });
    expect(r.priceStandard).toBe(100);
    expect(r.priceOfficiant).toBe(100);
  });

  it("sem pernoite ignora alojamento informado", () => {
    const r = calculateCaravanPrices({ overnight: false, priceTicket: 100, priceLodging: 26 });
    expect(r.priceLodging).toBe(0);
    expect(r.priceStandard).toBe(100);
  });

  it("com pernoite: 109 + 26 = 135", () => {
    const r = calculateCaravanPrices({ overnight: true, priceTicket: 109, priceLodging: 26 });
    expect(r.priceStandard).toBe(135);
  });

  it("oficiante: 50% de desconto só no alojamento (109 + 13 = 122)", () => {
    const r = calculateCaravanPrices({ overnight: true, priceTicket: 109, priceLodging: 26 });
    expect(r.priceOfficiant).toBe(122);
  });

  it("valores ajustados continuam consistentes", () => {
    const r = calculateCaravanPrices({ overnight: true, priceTicket: 115.5, priceLodging: 31.25 });
    expect(r.priceStandard).toBe(146.75);
    expect(r.priceOfficiant).toBe(131.13);
  });
});
