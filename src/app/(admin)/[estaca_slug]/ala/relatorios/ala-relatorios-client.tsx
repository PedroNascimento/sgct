"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WardFinancialPanelData } from "@/domain/types/report";
import { formatCurrency, formatDate } from "@/components/ui/format";
import {
  FinancialSummaryCards,
  FinancialRegistrantsSection,
  FinancialCreditsSection,
} from "@/components/financial/financial-panel-shared";

interface Caravan {
  id: string;
  title?: string | null;
  departure_date: string;
  return_date?: string | null;
  price: number;
  overnight?: boolean;
  status: string;
}

interface Props {
  estacaSlug: string;
  caravans: Caravan[];
  selectedCaravanId: string;
  panelData: WardFinancialPanelData;
}

export function AlaRelatoriosClient({
  estacaSlug,
  caravans,
  selectedCaravanId,
  panelData,
}: Props) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"inscritos" | "creditos">(
    "inscritos"
  );

  const handleCaravanChange = (newCaravanId: string) => {
    router.push(
      `/${estacaSlug}/ala/relatorios?caravanId=${encodeURIComponent(
        newCaravanId
      )}`
    );
  };

  const handleDownload = (format: "csv" | "pdf") => {
    if (!selectedCaravanId) return;
    setIsExporting(true);
    const url = `/api/reports/ward?caravanId=${encodeURIComponent(
      selectedCaravanId
    )}&format=${format}`;
    window.open(url, "_blank");
    setTimeout(() => setIsExporting(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Caravana e Exportação */}
      <div className="rounded-2xl border border-[#e0e2e2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 max-w-xl">
            <label
              htmlFor="caravan-select"
              className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1.5"
            >
              Caravana Selecionada
            </label>
            {caravans.length === 0 ? (
              <p className="text-sm text-[#707478]">
                Nenhuma caravana encontrada para a Estaca.
              </p>
            ) : (
              <select
                id="caravan-select"
                value={selectedCaravanId}
                onChange={(e) => handleCaravanChange(e.target.value)}
                className="w-full rounded-xl border border-[#c4c7c7] px-4 py-2.5 text-sm font-medium text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {caravans.map((c) => {
                  const dateStr = formatDate(c.departure_date);
                  const modeLabel = c.overnight ? "Com pernoite" : "Sem pernoite";
                  const label = c.title
                    ? `${c.title} (${dateStr}) · ${modeLabel}`
                    : `Saída em ${dateStr} · ${modeLabel} — ${formatCurrency(c.price)}`;
                  return (
                    <option key={c.id} value={c.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {selectedCaravanId && (
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => handleDownload("csv")}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Exportar CSV
              </button>

              <button
                type="button"
                onClick={() => handleDownload("pdf")}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-900 transition-colors disabled:opacity-50"
              >
                Exportar PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs da Ala */}
      <FinancialSummaryCards
        totalDue={panelData.summary.totalDue}
        totalPaidInWard={panelData.summary.totalPaidInWard}
        totalTransferredConfirmed={panelData.summary.totalTransferredConfirmed}
        totalRemainingToTransfer={panelData.summary.totalRemainingToTransfer}
        totalPendingMember={panelData.summary.totalPendingMember}
        countTotalActive={panelData.summary.countTotalActive}
        countConfirmed={panelData.summary.countConfirmed}
        countPagoAla={panelData.summary.countPagoAla}
        countPendingMember={panelData.summary.countPendingMember}
        scopeLabel={panelData.wardName}
      />

      {/* Navegação entre visões da Ala */}
      <div className="flex flex-wrap gap-2 border-b border-[#e0e2e2] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("inscritos")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "inscritos"
              ? "bg-brand-800 text-white shadow-sm"
              : "bg-white text-[#53575b] border border-[#e0e2e2] hover:bg-[#f4f6f6]"
          }`}
        >
          Inscritos da Ala ({panelData.registrants.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("creditos")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "creditos"
              ? "bg-brand-800 text-white shadow-sm"
              : "bg-white text-[#53575b] border border-[#e0e2e2] hover:bg-[#f4f6f6]"
          }`}
        >
          Créditos da Ala ({panelData.credits.filter((c) => c.status === "active").length} ativos)
        </button>
      </div>

      {activeTab === "inscritos" && (
        <FinancialRegistrantsSection
          registrants={panelData.registrants}
          emptyMessage={`Nenhum inscrito da ${panelData.wardName} encontrado nesta caravana.`}
        />
      )}

      {activeTab === "creditos" && (
        <FinancialCreditsSection credits={panelData.credits} />
      )}
    </div>
  );
}
