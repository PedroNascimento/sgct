"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StakeFinancialPanelData } from "@/domain/types/report";
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
  panelData: StakeFinancialPanelData;
}

export function EstacaRelatoriosClient({
  estacaSlug,
  caravans,
  selectedCaravanId,
  panelData,
}: Props) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"repasses" | "inscritos" | "creditos">(
    "repasses"
  );

  const handleCaravanChange = (newCaravanId: string) => {
    router.push(
      `/${estacaSlug}/estaca/relatorios?caravanId=${encodeURIComponent(
        newCaravanId
      )}`
    );
  };

  const handleDownload = (format: "csv" | "pdf") => {
    if (!selectedCaravanId) return;
    setIsExporting(true);
    const url = `/api/reports/stake?caravanId=${encodeURIComponent(
      selectedCaravanId
    )}&format=${format}`;
    window.open(url, "_blank");
    setTimeout(() => setIsExporting(false), 1000);
  };

  const wardOptions = panelData.transfersByWard.map((w) => ({
    id: w.wardId,
    name: w.wardName,
  }));

  return (
    <div className="space-y-6">
      {/* Seletor de Caravana e Exportação */}
      <div className="rounded-2xl border border-[#e0e2e2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 max-w-xl">
            <label
              htmlFor="stake-caravan-select"
              className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1.5"
            >
              Caravana Selecionada
            </label>
            {caravans.length === 0 ? (
              <p className="text-sm text-[#707478]">
                Nenhuma caravana cadastrada na Estaca.
              </p>
            ) : (
              <select
                id="stake-caravan-select"
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

      {/* KPIs Consolidados da Caravana */}
      <FinancialSummaryCards
        totalDue={panelData.totals.totalDue}
        totalPaidInWard={panelData.totals.totalPaidInWard}
        totalTransferredConfirmed={panelData.totals.totalTransferredConfirmed}
        totalRemainingToTransfer={panelData.totals.totalRemainingToTransfer}
        totalPendingMember={panelData.totals.totalPendingMember}
        countTotalActive={panelData.totals.countTotalActive}
        countConfirmed={panelData.totals.countConfirmed}
        countPagoAla={panelData.totals.countPagoAla}
        countPendingMember={panelData.totals.countPendingMember}
        scopeLabel="Estaca"
      />

      {/* Navegação entre visões do Painel */}
      <div className="flex flex-wrap gap-2 border-b border-[#e0e2e2] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("repasses")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "repasses"
              ? "bg-brand-800 text-white shadow-sm"
              : "bg-white text-[#53575b] border border-[#e0e2e2] hover:bg-[#f4f6f6]"
          }`}
        >
          Repasses por Ala ({panelData.transfersByWard.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("inscritos")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "inscritos"
              ? "bg-brand-800 text-white shadow-sm"
              : "bg-white text-[#53575b] border border-[#e0e2e2] hover:bg-[#f4f6f6]"
          }`}
        >
          Registro Detalhado ({panelData.registrants.length})
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
          Consulta de Créditos ({panelData.credits.filter((c) => c.status === "active").length} ativos)
        </button>
      </div>

      {/* Aba 1: Controle de Repasses por Ala (+ Outra Estaca) */}
      {activeTab === "repasses" && (
        <div className="rounded-2xl border border-[#e0e2e2] bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#212225]">
              Controle de Transferências por Ala
            </h2>
            <p className="text-xs text-[#53575b]">
              Atualizado automaticamente conforme as Alas confirmam pagamentos dos membros e a Estaca valida os recebimentos na Validação Semanal.
            </p>
          </div>

          {panelData.transfersByWard.length === 0 ? (
            <p className="text-sm text-[#707478]">
              Nenhuma Ala cadastrada nesta Estaca.
            </p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-[#e0e2e2]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1e3a5f] text-xs font-semibold uppercase tracking-wider text-white">
                    <tr>
                      <th className="px-4 py-3">Ala / Origem</th>
                      <th className="px-4 py-3 text-center">Inscritos</th>
                      <th className="px-4 py-3 text-right">Deve Transferir</th>
                      <th className="px-4 py-3 text-right">Pago na Ala</th>
                      <th className="px-4 py-3 text-right">Já Transferido</th>
                      <th className="px-4 py-3 text-right">Falta Transferir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f2]">
                    {panelData.transfersByWard.map((w) => (
                      <tr key={w.wardId} className="hover:bg-[#fafafa]">
                        <td className="px-4 py-3 font-semibold text-[#212225]">
                          {w.wardName}
                          {w.isGuestGroup && (
                            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                              Convidados
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-[#53575b]">
                          {w.countTotalActive}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#212225]">
                          {formatCurrency(w.totalDue)}
                        </td>
                        <td className="px-4 py-3 text-right text-sky-700 font-medium">
                          {formatCurrency(w.totalPaidInWard)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                          {formatCurrency(w.totalTransferredConfirmed)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-800">
                          {formatCurrency(w.totalRemainingToTransfer)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f4f6f6] font-bold text-[#212225]">
                    <tr>
                      <td className="px-4 py-3 uppercase text-xs tracking-wider">
                        Total Geral da Caravana
                      </td>
                      <td className="px-4 py-3 text-center">
                        {panelData.totals.countTotalActive}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(panelData.totals.totalDue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sky-800">
                        {formatCurrency(panelData.totals.totalPaidInWard)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-800">
                        {formatCurrency(panelData.totals.totalTransferredConfirmed)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-900">
                        {formatCurrency(panelData.totals.totalRemainingToTransfer)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-3 md:hidden">
                {panelData.transfersByWard.map((w) => (
                  <div
                    key={w.wardId}
                    className="rounded-xl border border-[#e0e2e2] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#212225]">{w.wardName}</span>
                      <span className="text-xs text-[#53575b]">
                        {w.countTotalActive} inscrito(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#707478] block">Deve transferir</span>
                        <strong className="text-[#212225]">
                          {formatCurrency(w.totalDue)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#707478] block">Já transferido</span>
                        <strong className="text-emerald-700">
                          {formatCurrency(w.totalTransferredConfirmed)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#707478] block">Pago na Ala</span>
                        <strong className="text-sky-700">
                          {formatCurrency(w.totalPaidInWard)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#707478] block">Falta transferir</span>
                        <strong className="text-amber-800">
                          {formatCurrency(w.totalRemainingToTransfer)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Aba 2: Registro Detalhado por Ala (Espelho da Planilha) */}
      {activeTab === "inscritos" && (
        <FinancialRegistrantsSection
          registrants={panelData.registrants}
          groupByWard
          wardOptions={wardOptions}
        />
      )}

      {/* Aba 3: Consulta de Créditos */}
      {activeTab === "creditos" && (
        <FinancialCreditsSection
          credits={panelData.credits}
          showWardColumn
          wardOptions={wardOptions}
        />
      )}
    </div>
  );
}
