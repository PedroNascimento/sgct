"use client";

import { useState } from "react";

interface Caravan {
  id: string;
  departure_date: string;
  return_date?: string | null;
  price: number;
  status: string;
}

interface Props {
  estacaSlug: string;
  wardName: string;
  caravans: Caravan[];
}

export function AlaRelatoriosClient({ estacaSlug, wardName, caravans }: Props) {
  const [selectedCaravanId, setSelectedCaravanId] = useState<string>(
    caravans[0]?.id || ""
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleDownload = (format: "csv" | "pdf") => {
    if (!selectedCaravanId) return;
    setIsExporting(true);
    const url = `/api/reports/ward?caravanId=${encodeURIComponent(
      selectedCaravanId
    )}&format=${format}`;
    window.open(url, "_blank");
    setTimeout(() => setIsExporting(false), 1000);
  };

  const selectedCaravan = caravans.find((c) => c.id === selectedCaravanId);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e0e2e2] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#212225] mb-4">
          Selecionar Caravana
        </h2>

        {caravans.length === 0 ? (
          <p className="text-sm text-[#707478]">Nenhuma caravana encontrada para a Estaca.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="caravan-select"
                className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
              >
                Caravana por Data de Saída
              </label>
              <select
                id="caravan-select"
                value={selectedCaravanId}
                onChange={(e) => setSelectedCaravanId(e.target.value)}
                className="w-full max-w-md rounded-xl border border-[#c4c7c7] px-4 py-2.5 text-sm font-medium text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {caravans.map((c) => {
                  const dateStr = new Date(c.departure_date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <option key={c.id} value={c.id}>
                      Saída em {dateStr} — R$ {c.price.toFixed(2)} ({c.status})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedCaravan && (
              <div className="pt-4 border-t border-[#f0f2f2] flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload("csv")}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar Relatório (CSV)
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload("pdf")}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-900 transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar Relatório (PDF)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-6">
        <h3 className="text-sm font-bold text-brand-900 mb-2">Informações sobre o Relatório</h3>
        <p className="text-xs text-brand-700 leading-relaxed">
          O relatório detalha o status financeiro de cada passageiro inscrito pela <strong>{wardName}</strong> na caravana selecionada. Ele contém nome, tipo de assento, data da reserva, status do pagamento, método e valor arrecadado para prestação de contas com o comitê da Estaca.
        </p>
      </div>
    </div>
  );
}
