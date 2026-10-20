"use client";

/**
 * Componente: Gestão e Registro de Permuta de Assentos (Spec 005 / US-005.2 / T005.10).
 *
 * Utilizado por Líderes de Caravana e Administradores de Estaca para:
 * - Registrar uma nova permuta (informando titular original e novo titular).
 * - Visualizar pedidos de permuta existentes.
 * - Aprovar permuta mediada (com validação de limite de 6 no dia do embarque).
 */

import React, { useState } from "react";
import type { SeatSwapRequest } from "@/domain/types/swap";
import type { Reservation } from "@/domain/types/reservation";
import type { Caravan } from "@/domain/types/caravan";

export interface SwapRequestWithDetails extends SeatSwapRequest {
  caravan_name?: string;
  original_holder_name?: string;
  seat_number?: number;
}

interface SeatSwapManagerProps {
  caravans: Caravan[];
  confirmedReservations: Reservation[];
  swapRequests: SwapRequestWithDetails[];
  canApprove: boolean;
  onRegisterSwap: (data: {
    reservationId: string;
    newHolderFullName: string;
    newHolderDocument?: string;
  }) => Promise<void>;
  onApproveSwap: (swapRequestId: string) => Promise<void>;
}

export function SeatSwapManager({
  caravans,
  confirmedReservations,
  swapRequests,
  canApprove,
  onRegisterSwap,
  onApproveSwap,
}: SeatSwapManagerProps) {
  const [selectedCaravanId, setSelectedCaravanId] = useState<string>(
    caravans[0]?.id || ""
  );
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");
  const [newHolderName, setNewHolderName] = useState<string>("");
  const [newHolderDoc, setNewHolderDoc] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const filteredReservations = confirmedReservations.filter(
    (r) => r.caravan_id === selectedCaravanId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!selectedReservationId) {
      setMessage({ type: "error", text: "Selecione a reserva a ser permutada." });
      return;
    }

    if (!newHolderName.trim() || newHolderName.trim().length < 3) {
      setMessage({
        type: "error",
        text: "Informe o nome completo do novo passageiro (mínimo 3 caracteres).",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onRegisterSwap({
        reservationId: selectedReservationId,
        newHolderFullName: newHolderName.trim(),
        newHolderDocument: newHolderDoc.trim() || undefined,
      });

      setMessage({ type: "success", text: "Permuta registrada com sucesso!" });
      setNewHolderName("");
      setNewHolderDoc("");
      setSelectedReservationId("");
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Erro ao registrar permuta.";
      setMessage({ type: "error", text: errText });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(swapId: string) {
    setMessage(null);
    try {
      setApprovingId(swapId);
      await onApproveSwap(swapId);
      setMessage({ type: "success", text: "Permuta aprovada com sucesso!" });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Erro ao aprovar permuta.";
      setMessage({ type: "error", text: errText });
    } finally {
      setApprovingId(null);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Gestão de Permutas de Assentos
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Permuta mediada por Líder de Caravana ou Admin da Estaca (D13/D16). Sem geração de crédito.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          className={`p-4 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Formulário de Registro de Permuta */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Registrar Nova Permuta
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="selectCaravan"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                Caravana
              </label>
              <select
                id="selectCaravan"
                value={selectedCaravanId}
                onChange={(e) => {
                  setSelectedCaravanId(e.target.value);
                  setSelectedReservationId("");
                }}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                {caravans.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="selectReservation"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                Reserva a Permutar (Assento Confirmado)
              </label>
              <select
                id="selectReservation"
                value={selectedReservationId}
                onChange={(e) => setSelectedReservationId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Selecione uma reserva...</option>
                {filteredReservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    Assento {r.seat_number} — R$ {r.payment_amount} ({r.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="newHolderName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                Nome Completo do Novo Titular
              </label>
              <input
                id="newHolderName"
                type="text"
                placeholder="Ex: João da Silva Santos"
                value={newHolderName}
                onChange={(e) => setNewHolderName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="newHolderDoc"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                Documento / CPF (Opcional)
              </label>
              <input
                id="newHolderDoc"
                type="text"
                placeholder="Ex: 000.000.000-00"
                value={newHolderDoc}
                onChange={(e) => setNewHolderDoc(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrar Permuta"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Permutas Solicitadas / Aprovadas */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Solicitações de Permuta ({swapRequests.length})
          </h2>
          <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50">
            Máximo 6 permutas no dia do embarque
          </span>
        </div>

        {swapRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma permuta registrada até o momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Caravana / Assento</th>
                  <th className="px-6 py-3">Novo Passageiro</th>
                  <th className="px-6 py-3">Data Solicitação</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {swapRequests.map((req) => (
                  <tr key={req.id} data-testid={`swap-row-${req.id}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {req.caravan_name || "Caravana"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {req.seat_number ? `Assento ${req.seat_number}` : "Assento vinculado"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{req.new_holder_full_name}</div>
                      {req.new_holder_document && (
                        <div className="text-xs text-slate-500">{req.new_holder_document}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === "approved" ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Aprovada
                        </span>
                      ) : req.status === "rejected" ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                          Rejeitada
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" && canApprove && (
                        <button
                          type="button"
                          onClick={() => handleApprove(req.id)}
                          disabled={approvingId === req.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                        >
                          {approvingId === req.id ? "Aprovando..." : "Aprovar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
