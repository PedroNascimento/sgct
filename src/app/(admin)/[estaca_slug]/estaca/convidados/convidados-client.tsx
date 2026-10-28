"use client";

import { useState, useTransition } from "react";
import { confirmGuestTransferAction } from "@/app/(admin)/[estaca_slug]/actions";
import type { PendingGuestTransferItem } from "@/domain/interfaces/guest-repository";
import { formatCurrency, formatDate } from "@/components/ui/format";
import { CheckIcon, InfoIcon, UserIcon } from "@/components/ui/icons";

interface Props {
  initialTransfers: PendingGuestTransferItem[];
  estacaSlug: string;
}

export function ConvidadosClient({ initialTransfers, estacaSlug }: Props) {
  const [transfers, setTransfers] = useState(initialTransfers);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleConfirm = (transferId: string) => {
    setMessage(null);
    setLoadingId(transferId);

    startTransition(async () => {
      try {
        const result = await confirmGuestTransferAction(transferId, estacaSlug);
        if (result.success) {
          setMessage({ type: "success", text: result.message || "Repasse confirmado com sucesso!" });
          setTransfers((prev) => prev.filter((t) => t.id !== transferId));
        } else {
          setMessage({ type: "error", text: result.error || "Erro ao confirmar repasse." });
        }
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Erro inesperado ao confirmar repasse.",
        });
      } finally {
        setLoadingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className={
            message.type === "success"
              ? "sgct-alert-success p-4 flex items-center gap-3"
              : "sgct-alert-danger p-4 flex items-center gap-3"
          }
        >
          {message.type === "success" ? (
            <CheckIcon className="h-5 w-5 shrink-0 text-success-700" />
          ) : (
            <InfoIcon className="h-5 w-5 shrink-0 text-danger-700" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="sgct-alert-info flex items-start gap-3 p-4">
        <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
        <div className="text-sm">
          <strong>Regra Constitucional de Prioridade (Artigo II.d / Decisão D28):</strong> Ao confirmar o repasse, se a caravana atingir a capacidade máxima e houver membros da Estaca anfitriã na lista de espera, o membro terá prioridade irrestrita sobre o convidado.
        </div>
      </div>

      {transfers.length === 0 ? (
        <div className="sgct-card p-12 text-center text-gray-500">
          <UserIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-lg font-bold text-gray-700">Nenhum repasse pendente</h3>
          <p className="mt-1 text-sm text-gray-500">
            Não há repasses de convidados de outras Estacas aguardando confirmação no momento.
          </p>
        </div>
      ) : (
        <div>
          {/* Visualização em Cartões no Mobile (Artigo X / M04 / T014.15) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {transfers.map((t) => {
              const isItemLoading = isPending && loadingId === t.id;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">
                        {t.profile?.full_name || "Convidado Inter-Estaca"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.profile?.phone || "Sem telefone"} {t.profile?.cpf ? `• CPF: ${t.profile.cpf}` : ""}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-100 text-brand-900 shrink-0">
                      Assento {t.reservation?.seat_number ?? "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 block">Origem</span>
                      <span className="font-medium text-gray-800">{t.origin_stake_name}</span>
                      <span className="text-xs text-gray-500 block">{t.origin_ward_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Valor</span>
                      <span className="font-bold text-gray-900 text-base">{formatCurrency(t.amount)}</span>
                      <span className="text-xs text-gray-400 block">{formatDate(t.created_at)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConfirm(t.id)}
                    disabled={isItemLoading || isPending}
                    className="w-full min-h-[48px] sgct-button-primary text-sm font-bold justify-center inline-flex items-center gap-2 rounded-xl disabled:opacity-50"
                  >
                    {isItemLoading ? (
                      <>Confirmando repasse...</>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        Confirmar Repasse
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Visualização em Tabela no Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">Convidado</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Assento</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Data da Solicitação</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((t) => {
                  const isItemLoading = isPending && loadingId === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {t.profile?.full_name || "Convidado Inter-Estaca"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.profile?.phone || "Sem telefone"} {t.profile?.cpf ? `• CPF: ${t.profile.cpf}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{t.origin_stake_name}</div>
                        <div className="text-xs text-gray-500">{t.origin_ward_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                          Assento {t.reservation?.seat_number ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleConfirm(t.id)}
                          disabled={isItemLoading || isPending}
                          className="sgct-button-primary min-h-[44px] text-xs py-2 px-3.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isItemLoading ? (
                            <>Confirmando...</>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4" />
                              Confirmar Repasse
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
