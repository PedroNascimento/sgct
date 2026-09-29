"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/components/ui/format";
import {
  confirmSingleTransferAction,
  rejectTransferAction,
  validateWeeklyTransfersAction,
} from "../../actions";
import { MaskedCpf, CpfVisibilityToggle } from "@/components/admin/masked-cpf";
import { useFeedbackModal } from "@/components/ui/feedback-modal";

interface PassengerItem {
  id: string;
  seat_number: number | null;
  payment_amount: number;
  profiles: {
    full_name: string;
    cpf?: string | null;
  };
  wards: {
    name: string;
  };
}

interface CaravanValidationItem {
  id: string;
  departure_date: string;
  pagoAlaCount: number;
  isEmbarkmentWeek: boolean;
  pagoAlaList: PassengerItem[];
}

export function ValidacaoSemanalClient({
  caravans,
}: {
  caravans: CaravanValidationItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const { feedbackModal, showConfirm, showError, showSuccess } = useFeedbackModal();
  const [revealedCpfIds, setRevealedCpfIds] = useState<Set<string>>(new Set());

  const allPassengers = caravans.flatMap((c) => c.pagoAlaList);
  const isAllCpfsRevealed =
    allPassengers.length > 0 &&
    allPassengers.every((p) => revealedCpfIds.has(p.id));

  const toggleCpfVisibility = (id: string) => {
    setRevealedCpfIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCpfsVisibility = () => {
    if (isAllCpfsRevealed) {
      setRevealedCpfIds(new Set());
    } else {
      setRevealedCpfIds(new Set(allPassengers.map((p) => p.id)));
    }
  };

  const handleValidateBatch = (caravanId: string, count: number) => {
    showConfirm({
      title: "Validar Transferências em Lote",
      message: (
        <span>
          Deseja confirmar a validação de todas as <strong className="text-[#212225]">{count} transferência(s)</strong> desta caravana?
          <br className="mb-2" />
          Os assentos serão confirmados definitivamente para a viagem ao Templo.
        </span>
      ),
      confirmLabel: `Validar em Lote (${count})`,
      confirmVariant: "primary",
      onConfirm: async () => {
        const res = await validateWeeklyTransfersAction(caravanId);
        if (!res.success) {
          showError({
            title: "Erro ao validar transferências",
            message: res.message || res.error || "Erro ao validar transferências.",
          });
        } else {
          showSuccess({
            title: "Transferências Validadas",
            message: res.message || "Todas as transferências em lote foram validadas com sucesso.",
          });
        }
      },
    });
  };

  const handleConfirmSingle = (reservationId: string, passengerName: string) => {
    showConfirm({
      title: "Confirmar Transferência",
      message: (
        <span>
          Confirmar o repasse de <strong className="text-[#212225]">{passengerName}</strong>?
          <br className="mb-2" />
          A vaga do membro será confirmada pela Estaca.
        </span>
      ),
      confirmLabel: "Confirmar Vaga",
      confirmVariant: "primary",
      onConfirm: async () => {
        const res = await confirmSingleTransferAction(reservationId);
        if (!res.success) {
          showError({
            title: "Erro ao confirmar transferência",
            message: res.error || "Não foi possível confirmar o repasse.",
          });
        } else {
          showSuccess({
            title: "Transferência Confirmada",
            message: `A vaga de ${passengerName} foi confirmada com sucesso!`,
          });
        }
      },
    });
  };

  const handleReject = (reservationId: string, passengerName: string) => {
    showConfirm({
      title: "Recusar Repasse de Pagamento",
      message: (
        <span>
          Deseja realmente recusar o repasse de <strong className="text-[#212225]">{passengerName}</strong>?
          <br className="mb-2" />
          A reserva retornará para a Ala realizar uma nova conferência.
        </span>
      ),
      confirmLabel: "Sim, Recusar Repasse",
      confirmVariant: "danger",
      onConfirm: async () => {
        const res = await rejectTransferAction(reservationId);
        if (!res.success) {
          showError({
            title: "Erro ao recusar repasse",
            message: res.error || "Não foi possível recusar o repasse.",
          });
        } else {
          showSuccess({
            title: "Repasse Recusado",
            message: `O repasse de ${passengerName} foi recusado e devolvido à Ala.`,
          });
        }
      },
    });
  };

  if (caravans.length === 0) {
    return (
      <div className="sgct-card p-12 text-center">
        <h3 className="text-lg font-bold text-[#212225]">Nenhuma caravana aberta</h3>
        <p className="mt-2 text-sm text-[#53575b]">
          Não há viagens abertas com repasses pendentes de validação no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {caravans.map((caravan) => (
        <section key={caravan.id} className="sgct-card overflow-hidden">
          {/* Cabeçalho da Caravana */}
          <div className="border-b border-[#e0e2e2] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#fcfdfd]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
                Viagem ao Templo
              </span>
              <h2 className="text-xl font-bold text-[#212225] mt-1">
                Saída em {formatDate(caravan.departure_date)}
              </h2>
              <p className="text-xs text-[#53575b] mt-0.5">
                {caravan.pagoAlaCount} repasse(s) pago(s) na Ala aguardando confirmação da Estaca.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {caravan.pagoAlaCount > 0 && (
                <>
                  <CpfVisibilityToggle
                    allRevealed={isAllCpfsRevealed}
                    onToggleAll={toggleAllCpfsVisibility}
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleValidateBatch(caravan.id, caravan.pagoAlaCount)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-950 transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Validando..." : `Validar todos em lote (${caravan.pagoAlaCount})`}
                  </button>
                </>
              )}
            </div>
          </div>

          {caravan.pagoAlaCount === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-base font-bold text-[#212225]">Tudo em dia nesta caravana!</h3>
              <p className="mt-1 text-xs text-[#53575b]">
                Não há nenhum repasse aguardando validação semanal no momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e0e2e2] text-sm">
                <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Assento</th>
                    <th className="px-6 py-3 text-left font-medium">Passageiro</th>
                    <th className="px-6 py-3 text-left font-medium">Ala de Origem</th>
                    <th className="px-6 py-3 text-left font-medium">Valor Repassado</th>
                    <th className="px-6 py-3 text-right font-medium">Ações da Estaca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e2e2] bg-white">
                  {caravan.pagoAlaList.map((passenger) => (
                    <tr key={passenger.id} className="hover:bg-brand-50/40">
                      <td className="px-6 py-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-900 text-xs">
                          {passenger.seat_number ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#212225]">{passenger.profiles?.full_name}</p>
                        <div className="mt-0.5">
                          <MaskedCpf
                            cpf={passenger.profiles?.cpf}
                            isRevealed={revealedCpfIds.has(passenger.id)}
                            onToggle={() => toggleCpfVisibility(passenger.id)}
                            memberName={passenger.profiles?.full_name}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#3a3d40]">
                        {passenger.wards?.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-900">
                        {formatCurrency(Number(passenger.payment_amount))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleConfirmSingle(passenger.id, passenger.profiles?.full_name)}
                            className="inline-flex items-center rounded-lg bg-success-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-success-800 transition-colors shadow-2xs disabled:opacity-50"
                          >
                            ✓ Validar
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleReject(passenger.id, passenger.profiles?.full_name)}
                            className="inline-flex items-center rounded-lg border border-danger-200 bg-danger-50 px-3 py-1.5 text-xs font-bold text-danger-700 hover:bg-danger-100 transition-colors disabled:opacity-50"
                          >
                            ✕ Recusar p/ Ala
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Modal de Feedback (Erros, Alertas e Confirmações) */}
      {feedbackModal}
    </div>
  );
}
