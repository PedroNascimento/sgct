"use client";

import { useMemo, useState } from "react";
import type {
  FinancialCreditRow,
  FinancialRegistrantRow,
} from "@/domain/types/report";
import {
  formatCreditSourceLabel,
  formatFundingSourceLabel,
} from "@/domain/financial/transfer-summary";
import { formatCurrency, formatDate } from "@/components/ui/format";

function formatDateTimePtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RESERVATION_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  confirmado: {
    label: "Transferido / Confirmado",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  presente: {
    label: "Confirmado (Presente)",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pago_ala: {
    label: "Pago na Ala (Aguard. Repasse)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  pendente: {
    label: "Pendente na Ala",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  aguardando_auxilio: {
    label: "Aguardando Auxílio",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  aguardando_transferencia_interestaca: {
    label: "Aguard. Transf. Inter-Estaca",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  cancelada_com_credito: {
    label: "Cancelada c/ Crédito",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  cancelada_sem_credito: {
    label: "Cancelada s/ Crédito",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
  expirada: {
    label: "Expirada",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
  lista_espera: {
    label: "Lista de Espera",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  no_show: {
    label: "No-Show",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

function getReservationStatusMeta(status: string) {
  return (
    RESERVATION_STATUS_META[status] ?? {
      label: status,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}

const CREDIT_STATUS_META: Record<string, { label: string; badgeClass: string }> =
  {
    active: {
      label: "Ativo",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    used: {
      label: "Utilizado",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    },
    expired: {
      label: "Expirado",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

export interface FinancialSummaryCardsProps {
  totalDue: number;
  totalPaidInWard: number;
  totalTransferredConfirmed: number;
  totalRemainingToTransfer: number;
  totalPendingMember: number;
  countTotalActive: number;
  countConfirmed: number;
  countPagoAla: number;
  countPendingMember: number;
  scopeLabel: string;
}

export function FinancialSummaryCards({
  totalDue,
  totalPaidInWard,
  totalTransferredConfirmed,
  totalRemainingToTransfer,
  totalPendingMember,
  countTotalActive,
  countConfirmed,
  countPagoAla,
  countPendingMember,
  scopeLabel,
}: FinancialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col justify-between rounded-2xl border border-[#e0e2e2] bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#53575b]">
            Total Devido ({scopeLabel})
          </p>
          <p className="mt-2 text-2xl font-bold text-[#212225]">
            {formatCurrency(totalDue)}
          </p>
        </div>
        <p className="mt-3 text-xs text-[#707478]">
          {countTotalActive} inscrição(ões) ativa(s) na caravana
        </p>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Transferido e Confirmado
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">
            {formatCurrency(totalTransferredConfirmed)}
          </p>
        </div>
        <p className="mt-3 text-xs text-emerald-700">
          {countConfirmed} reserva(s) validada(s) pela Estaca
        </p>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
            Pago na Ala (A Repassar)
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-900">
            {formatCurrency(totalPaidInWard)}
          </p>
        </div>
        <p className="mt-3 text-xs text-sky-700">
          {countPagoAla} pagamento(s) aguardando repasse/validação
        </p>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Ainda Falta Transferir
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            {formatCurrency(totalRemainingToTransfer)}
          </p>
        </div>
        <p className="mt-3 text-xs text-amber-800">
          Inclui {formatCurrency(totalPendingMember)} pendente com membros ({countPendingMember})
        </p>
      </div>
    </div>
  );
}

interface FinancialRegistrantsSectionProps {
  registrants: FinancialRegistrantRow[];
  groupByWard?: boolean;
  wardOptions?: { id: string; name: string }[];
  emptyMessage?: string;
}

export function FinancialRegistrantsSection({
  registrants,
  groupByWard = false,
  wardOptions = [],
  emptyMessage = "Nenhum inscrito encontrado para a caravana selecionada.",
}: FinancialRegistrantsSectionProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrants.filter((r) => {
      if (q && !r.passengerName.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (wardFilter !== "all") {
        if (wardFilter === "convidados") {
          if (!r.isGuest) return false;
        } else if (r.wardId !== wardFilter) {
          return false;
        }
      }
      return true;
    });
  }, [registrants, search, statusFilter, wardFilter]);

  const grouped = useMemo(() => {
    if (!groupByWard) {
      return [{ key: "single", title: "", rows: filtered }];
    }
    const map = new Map<string, { title: string; rows: FinancialRegistrantRow[] }>();
    for (const row of filtered) {
      const key = row.isGuest ? "convidados" : row.wardId ?? "sem-ala";
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(key, { title: row.wardName, rows: [row] });
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      title: value.title,
      rows: value.rows,
    }));
  }, [filtered, groupByWard]);

  const filteredTotal = useMemo(
    () => filtered.reduce((acc, r) => acc + r.paymentAmount, 0),
    [filtered]
  );

  return (
    <div className="rounded-2xl border border-[#e0e2e2] bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#212225]">
            Registro Detalhado por Inscrito
          </h2>
          <p className="text-xs text-[#53575b]">
            Espelho financeiro das inscrições da caravana (data/hora, nome, forma de pagamento, valor devido e status).
          </p>
        </div>
        <div className="rounded-xl border border-[#e0e2e2] bg-[#f8f9fa] px-3.5 py-2 text-right">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#707478]">
            Total Filtrado ({filtered.length})
          </span>
          <span className="text-base font-bold text-[#212225]">
            {formatCurrency(filteredTotal)}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            htmlFor="fin-reg-search"
            className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
          >
            Buscar por Nome
          </label>
          <input
            id="fin-reg-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome do passageiro..."
            className="w-full rounded-xl border border-[#c4c7c7] px-3.5 py-2 text-sm text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>

        {groupByWard && wardOptions.length > 0 && (
          <div>
            <label
              htmlFor="fin-reg-ward"
              className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
            >
              Filtrar por Ala
            </label>
            <select
              id="fin-reg-ward"
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full rounded-xl border border-[#c4c7c7] px-3.5 py-2 text-sm text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="all">Todas as Alas e Outra Estaca</option>
              {wardOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="fin-reg-status"
            className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
          >
            Filtrar por Situação
          </label>
          <select
            id="fin-reg-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-[#c4c7c7] px-3.5 py-2 text-sm text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="all">Todas as situações</option>
            <option value="confirmado">Transferido / Confirmado</option>
            <option value="pago_ala">Pago na Ala (Aguard. Repasse)</option>
            <option value="pendente">Pendente na Ala</option>
            <option value="aguardando_auxilio">Aguardando Auxílio</option>
            <option value="aguardando_transferencia_interestaca">
              Aguard. Transf. Inter-Estaca
            </option>
            <option value="cancelada_com_credito">Cancelada c/ Crédito</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d6d9da] bg-[#fafafa] p-8 text-center text-sm text-[#707478]">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const groupTotal = group.rows.reduce(
              (acc, r) => acc + r.paymentAmount,
              0
            );
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-xl border border-[#e0e2e2]"
              >
                {group.title && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1e3a5f] px-4 py-2.5 text-white">
                    <span className="text-sm font-bold uppercase tracking-wide">
                      {group.title}
                    </span>
                    <span className="text-xs font-semibold">
                      {group.rows.length} inscrito(s) · Total:{" "}
                      {formatCurrency(groupTotal)}
                    </span>
                  </div>
                )}

                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f4f6f6] text-xs font-semibold uppercase tracking-wider text-[#53575b]">
                      <tr>
                        <th className="px-4 py-2.5">Inscrição</th>
                        <th className="px-4 py-2.5">Nome Completo</th>
                        <th className="px-4 py-2.5">Forma de Pagamento</th>
                        <th className="px-4 py-2.5">Situação</th>
                        <th className="px-4 py-2.5 text-right">Valor Devido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f2]">
                      {group.rows.map((row) => {
                        const meta = getReservationStatusMeta(row.status);
                        return (
                          <tr key={row.reservationId} className="hover:bg-[#fafafa]">
                            <td className="px-4 py-2.5 text-xs text-[#53575b] whitespace-nowrap">
                              {formatDateTimePtBr(row.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-[#212225]">
                              <div>{row.passengerName}</div>
                              {row.originLabel && (
                                <div className="text-xs text-[#707478]">
                                  Origem: {row.originLabel}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[#53575b]">
                              {formatFundingSourceLabel(row.fundingSource)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-[#212225] whitespace-nowrap">
                              {formatCurrency(row.paymentAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[#f8f9fa] font-bold text-[#212225]">
                      <tr>
                        <td colSpan={4} className="px-4 py-2.5 text-xs uppercase tracking-wider">
                          Total Geral {group.title ? `— ${group.title}` : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(groupTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards (sem scroll horizontal) */}
                <div className="divide-y divide-[#f0f2f2] md:hidden">
                  {group.rows.map((row) => {
                    const meta = getReservationStatusMeta(row.status);
                    return (
                      <div key={row.reservationId} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#212225]">
                              {row.passengerName}
                            </p>
                            <p className="text-xs text-[#707478]">
                              {formatDateTimePtBr(row.createdAt)}
                            </p>
                          </div>
                          <span className="font-bold text-[#212225]">
                            {formatCurrency(row.paymentAmount)}
                          </span>
                        </div>
                        <p className="text-xs text-[#53575b]">
                          {formatFundingSourceLabel(row.fundingSource)}
                        </p>
                        {row.originLabel && (
                          <p className="text-xs text-[#707478]">
                            Origem: {row.originLabel}
                          </p>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FinancialCreditsSectionProps {
  credits: FinancialCreditRow[];
  showWardColumn?: boolean;
  wardOptions?: { id: string; name: string }[];
}

export function FinancialCreditsSection({
  credits,
  showWardColumn = false,
  wardOptions = [],
}: FinancialCreditsSectionProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [wardFilter, setWardFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return credits.filter((c) => {
      if (q && !c.memberName.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (wardFilter !== "all" && c.wardId !== wardFilter) return false;
      return true;
    });
  }, [credits, search, statusFilter, wardFilter]);

  const totalActiveCredits = useMemo(
    () =>
      credits
        .filter((c) => c.status === "active")
        .reduce((acc, c) => acc + c.amount, 0),
    [credits]
  );

  return (
    <div className="rounded-2xl border border-[#e0e2e2] bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#212225]">
            Consulta de Créditos (Cancelamentos e Promoções)
          </h2>
          <p className="text-xs text-[#53575b]">
            Consulte membros que possuem crédito disponível para uso em futuras caravanas após cancelamento ou lista de espera.
          </p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 px-3.5 py-2 text-right">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-purple-800">
            Créditos Ativos
          </span>
          <span className="text-base font-bold text-purple-900">
            {formatCurrency(totalActiveCredits)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            htmlFor="fin-cred-search"
            className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
          >
            Buscar Membro
          </label>
          <input
            id="fin-cred-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome do titular do crédito..."
            className="w-full rounded-xl border border-[#c4c7c7] px-3.5 py-2 text-sm text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>

        {showWardColumn && wardOptions.length > 0 && (
          <div>
            <label
              htmlFor="fin-cred-ward"
              className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
            >
              Filtrar por Ala
            </label>
            <select
              id="fin-cred-ward"
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full rounded-xl border border-[#c4c7c7] px-3.5 py-2 text-sm text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="all">Todas as Alas</option>
              {wardOptions
                .filter((w) => w.id !== "convidados")
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="fin-cred-status"
            className="block text-xs font-semibold uppercase tracking-wider text-[#53575b] mb-1"
          >
            Situação do Crédito
          </label>
          <select
            id="fin-cred-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-[#c4c7c7] px-3.5 py-2 text-sm text-[#212225] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="active">Somente Ativos</option>
            <option value="used">Utilizados</option>
            <option value="expired">Expirados</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d6d9da] bg-[#fafafa] p-8 text-center text-sm text-[#707478]">
          Nenhum crédito encontrado para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-[#e0e2e2]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f4f6f6] text-xs font-semibold uppercase tracking-wider text-[#53575b]">
                <tr>
                  <th className="px-4 py-2.5">Membro</th>
                  {showWardColumn && <th className="px-4 py-2.5">Ala</th>}
                  <th className="px-4 py-2.5">Origem</th>
                  <th className="px-4 py-2.5">Situação</th>
                  <th className="px-4 py-2.5">Validade</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f2]">
                {filtered.map((c) => {
                  const meta = CREDIT_STATUS_META[c.status] ?? {
                    label: c.status,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  return (
                    <tr key={c.creditId} className="hover:bg-[#fafafa]">
                      <td className="px-4 py-2.5 font-medium text-[#212225]">
                        <div>{c.memberName}</div>
                        {c.reason && (
                          <div className="text-xs text-[#707478]">{c.reason}</div>
                        )}
                      </td>
                      {showWardColumn && (
                        <td className="px-4 py-2.5 text-xs text-[#53575b]">
                          {c.wardName}
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-xs text-[#53575b]">
                        {formatCreditSourceLabel(c.source)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#53575b]">
                        {formatDate(c.expiresAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#212225]">
                        {formatCurrency(c.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#f0f2f2] rounded-xl border border-[#e0e2e2] md:hidden">
            {filtered.map((c) => {
              const meta = CREDIT_STATUS_META[c.status] ?? {
                label: c.status,
                badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
              };
              return (
                <div key={c.creditId} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#212225]">{c.memberName}</p>
                    <span className="font-bold text-[#212225]">
                      {formatCurrency(c.amount)}
                    </span>
                  </div>
                  {showWardColumn && (
                    <p className="text-xs text-[#53575b]">{c.wardName}</p>
                  )}
                  <p className="text-xs text-[#707478]">
                    {formatCreditSourceLabel(c.source)} · Válido até{" "}
                    {formatDate(c.expiresAt)}
                  </p>
                  {c.reason && (
                    <p className="text-xs text-[#707478]">{c.reason}</p>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
