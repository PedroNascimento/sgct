"use client";

import { useState } from "react";
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
 * Campos de precificação da caravana (D33): tipo (com/sem pernoite),
 * valor da passagem e valor do alojamento, com pré-visualização do valor final.
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

  return (
    <div className="md:col-span-2 space-y-4">
      <fieldset>
        <legend className="sgct-label">Tipo de Caravana *</legend>
        <input type="hidden" name="overnight" value={String(overnight)} />
        <div className="mt-1 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de caravana">
          {[
            { value: false, label: "Sem pernoite", hint: "Ida e volta no mesmo dia" },
            { value: true, label: "Com pernoite", hint: "Inclui alojamento" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={overnight === opt.value}
              onClick={() => changeType(opt.value)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                overnight === opt.value
                  ? "border-[#006184] bg-[#e8f4f8] ring-2 ring-[#006184]/30"
                  : "border-[#d5d8db] bg-white hover:bg-[#f6f7f8]"
              }`}
            >
              <span className="block text-sm font-semibold text-[#212225]">{opt.label}</span>
              <span className="block text-xs text-[#707478]">{opt.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="sgct-label" htmlFor="priceTicket">
            Valor da Passagem / Ônibus (R$) *
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
            Valor do Alojamento (R$) {overnight ? "*" : ""}
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
          {!overnight && (
            <p className="mt-1 text-xs text-[#707478]">Caravana sem pernoite não tem alojamento.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#d5d8db] bg-[#f6f7f8] px-4 py-3 text-sm text-[#3a3d40]">
        <p>
          <strong>Valor final — Padrão (Adulto / Jovem):</strong> {formatCurrency(prices.priceStandard)}
        </p>
        <p>
          <strong>Valor final — Oficiante:</strong> {formatCurrency(prices.priceOfficiant)}
          {overnight && prices.priceLodging > 0 && (
            <span className="text-[#707478]"> (50% de desconto somente no alojamento)</span>
          )}
        </p>
      </div>
    </div>
  );
}
