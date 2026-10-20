"use client";

/**
 * Componente: Visualização de Créditos do Membro (Spec 005 / US-005.3 / T005.9).
 *
 * Exibe:
 * - Saldo total de créditos ativos disponíveis.
 * - Lista detalhada de créditos com valor, origem, status e data de expiração visível.
 * - Alerta para créditos próximos do vencimento (12 meses de validade).
 */

import React from "react";
import type { CreditLedgerEntry } from "@/domain/types/credit";

interface MemberCreditsViewProps {
  credits: CreditLedgerEntry[];
  userName?: string;
}

export function MemberCreditsView({ credits, userName }: MemberCreditsViewProps) {
  const activeCredits = credits.filter((c) => c.status === "active");
  const pastCredits = credits.filter((c) => c.status !== "active");

  const totalActiveBalance = activeCredits.reduce((acc, curr) => acc + curr.amount, 0);

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function getSourceLabel(source: CreditLedgerEntry["source"]): string {
    switch (source) {
      case "waitlist_promotion":
        return "Promoção da Fila de Espera";
      case "caravan_cancelled":
        return "Caravana Cancelada";
      case "exceptional_grant":
        return "Concessão Excepcional";
      default:
        return source;
    }
  }

  function getStatusBadge(status: CreditLedgerEntry["status"]) {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Ativo
          </span>
        );
      case "used":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Utilizado
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            Expirado
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Meus Créditos de Caravana
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {userName ? `Olá, ${userName}. ` : ""}
          Consulte seu saldo de crédito gerado por promoções de lista de espera ou cancelamentos.
        </p>
      </div>

      {/* Card de Saldo */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
        <span className="text-sm font-medium uppercase tracking-wider text-teal-100">
          Saldo Disponível para Uso
        </span>
        <div className="mt-2 text-4xl font-extrabold tracking-tight">
          {formatCurrency(totalActiveBalance)}
        </div>
        <p className="mt-2 text-xs text-teal-100/90">
          Válido para abatimento de futuras reservas de caravanas ao templo. Válido por 12 meses a partir da emissão.
        </p>
      </div>

      {/* Lista de Créditos Ativos */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Créditos Ativos ({activeCredits.length})
          </h2>
        </div>

        {activeCredits.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Você não possui créditos ativos disponíveis no momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeCredits.map((credit) => (
              <div
                key={credit.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                data-testid={`credit-row-${credit.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(credit.amount)}
                    </span>
                    {getStatusBadge(credit.status)}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Origem: <span className="font-medium">{getSourceLabel(credit.source)}</span>
                  </p>
                  {credit.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Motivo: {credit.reason}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <span className="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data de Expiração
                  </span>
                  <span className="inline-block text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200/60 dark:border-amber-800/40">
                    Expira em {formatDate(credit.expires_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Créditos Anteriores (Usados / Expirados) */}
      {pastCredits.length > 0 && (
        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Histórico de Créditos Utilizados / Expirados
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pastCredits.map((credit) => (
              <div
                key={credit.id}
                className="p-5 flex items-center justify-between opacity-75"
                data-testid={`past-credit-row-${credit.id}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(credit.amount)}
                    </span>
                    {getStatusBadge(credit.status)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {getSourceLabel(credit.source)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  {credit.status === "used" && credit.used_at ? (
                    <span>Usado em {formatDate(credit.used_at)}</span>
                  ) : (
                    <span>Expirou em {formatDate(credit.expires_at)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
