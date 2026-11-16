"use client";

import { useState } from "react";
import { Bus, BedDouble } from "lucide-react";
import {
  SUGGESTED_PRICING,
  calculateCaravanPrices,
} from "@/domain/pricing/caravan-pricing";
import { formatCurrency } from "@/components/ui/format";

interface Props {
  defaultOvernight?: boolean;
  defaultTicket?: number;
  defaultLodging?: number;
}

/**
 * Bloco de precificação da caravana (D33): tipo (com/sem pernoite),
 * valor da passagem e do alojamento, com pré-visualização do valor final.
 * Ocupa a linha inteira do grid pai (col-span-full).
 * Envia no formulário: overnight, priceTicket, priceLodging.
 */
export function CaravanPricingFields({
  defaultOvernight = true,
  defaultTicket,
  defaultLodging,
}: Props) {
  const initial = defaultOvernight
    ? SUGGESTED_PRICING.withOvernight
    : SUGGESTED_PRICING.withoutOvernight;
  const [overnight, setOvernight] = useState(defaultOvernight);
  const [ticket, setTicket] = useState<string>(String(defaultTicket ?? initial.ticket));
  const [lodging, setLodging] = useState<string>(String(defaultLodging ?? initial.lodging));

  function changeType(next: boolean) {
    if (next === overnight) return;
    const suggested = next ? SUGGESTED_PRICING.withOvernight : SUGGESTED_PRICING.withoutOvernight;
    setOvernight(next);
    setTicket(String(suggested.ticket));
    setLodging(String(suggested.lodging));
  }

  const prices = calculateCaravanPrices({
    overnight,
    priceTicket: Number(ticket) || 0,
    priceLodging: Number(lodging) || 0,
  });

  const options = [
    { value: false, label: "Sem pernoite", hint: "Ida e volta no mesmo dia", Icon: Bus },
    { value: true, label: "Com pernoite", hint: "Inclui alojamento", Icon: BedDouble },
  ];

  return (
    <fieldset className="col-span-full min-w-0 space-y-3 rounded-xl border border-[#e0e2e2] bg-[#fbfcfc] p-3">
      <legend className="px-1 text-sm font-semibold text-[#212225]">
        Tipo de caravana e valores *
      </legend>

      <input type="hidden" name="overnight" value={String(overnight)} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de caravana">
        {options.map(({ value, label, hint, Icon }) => {
          const selected = overnight === value;
          return (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => changeType(value)}
              className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                selected
                  ? "border-[#006184] bg-[#e8f4f8] ring-2 ring-[#006184]/25"
                  : "border-[#d5d8db] bg-white hover:bg-[#f6f7f8]"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${selected ? "text-[#006184]" : "text-[#707478]"}`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#212225]">{label}</span>
                <span className="block text-xs text-[#707478]">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:min-w-0">
        <div>
          <label className="sgct-label" htmlFor="priceTicket">
            Passagem / Ônibus (R$) *
          </label>
          <input
            id="priceTicket"
            type="number"
            step="0.01"
            min={0}
            name="priceTicket"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            required
            className="sgct-input"
          />
        </div>

        <div>
          <label className="sgct-label" htmlFor="priceLodging">
            Alojamento (R$){overnight ? " *" : ""}
          </label>
          <input
            id="priceLodging"
            type="number"
            step="0.01"
            min={0}
            name="priceLodging"
            value={overnight ? lodging : "0"}
            onChange={(e) => setLodging(e.target.value)}
            disabled={!overnight}
            required={overnight}
            className="sgct-input disabled:cursor-not-allowed disabled:bg-[#f0f1f2]"
          />
        </div>
      </div>

      {!overnight && (
        <p className="-mt-2 text-xs text-[#707478]">
          Caravana sem pernoite não tem alojamento.
        </p>
      )}

      <dl className="grid grid-cols-1 gap-2 rounded-lg border border-[#d5d8db] bg-white px-3 py-2 text-sm sm:grid-cols-2 sm:gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[#53575b]">Padrão (Adulto / Jovem)</dt>
          <dd className="font-bold text-[#212225]">{formatCurrency(prices.priceStandard)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[#53575b]">Oficiante</dt>
          <dd className="font-bold text-[#212225]">{formatCurrency(prices.priceOfficiant)}</dd>
        </div>
      </dl>

      {overnight && prices.priceLodging > 0 && (
        <p className="-mt-2 text-xs text-[#707478]">
          Oficiante tem 50% de desconto somente no alojamento; a passagem é integral.
        </p>
      )}
    </fieldset>
  );
}
