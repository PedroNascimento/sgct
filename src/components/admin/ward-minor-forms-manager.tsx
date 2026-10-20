"use client";

import React, { useState } from "react";
import { evaluateMinorFormAction, getMinorDocumentViewUrlAction } from "@/app/(admin)/[estaca_slug]/actions";

export interface PendingMinorFormItem {
  id: string;
  reservationId: string;
  memberName: string;
  memberCpf: string;
  seatNumber: number;
  caravanDepartureDate: string;
  storagePath: string;
  status: "pending" | "approved" | "rejected";
}

export interface WardMinorFormsManagerProps {
  estacaSlug: string;
  forms: PendingMinorFormItem[];
}

export function WardMinorFormsManager({
  estacaSlug,
  forms,
}: WardMinorFormsManagerProps) {
  const [items, setItems] = useState<PendingMinorFormItem[]>(forms);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEvaluate = async (formId: string, status: "approved" | "rejected") => {
    setLoadingId(formId);
    setMessage(null);
    setErrorMessage(null);

    const res = await evaluateMinorFormAction(estacaSlug, formId, status);
    if (res.success) {
      setItems((prev) => prev.filter((item) => item.id !== formId));
      setMessage(res.message || "Formulário avaliado com sucesso!");
    } else {
      setErrorMessage(res.error || "Erro ao processar formulário.");
    }
    setLoadingId(null);
  };

  const handleViewDocument = async (formId: string) => {
    setErrorMessage(null);
    const res = await getMinorDocumentViewUrlAction(formId);
    if (res.success && res.url) {
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      setErrorMessage(res.error || "Não foi possível abrir o documento.");
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div role="status" className="sgct-alert-success text-sm">
          {message}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="sgct-alert-danger text-sm">
          {errorMessage}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#bdc0c0] p-12 text-center bg-white shadow-card">
          <p className="text-base font-semibold text-[#212225]">
            Nenhum formulário de menor aguardando avaliação.
          </p>
          <p className="mt-1 text-sm text-[#53575b]">
            Quando jovens anexarem o termo de autorização assinado, eles aparecerão aqui para conferência.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e0e2e2] bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e0e2e2] bg-[#f7f8f8] text-xs font-bold uppercase tracking-wider text-[#53575b]">
              <tr>
                <th className="px-6 py-4">Membro / Jovem</th>
                <th className="px-6 py-4">Assento</th>
                <th className="px-6 py-4">Data da Caravana</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f2] text-[#212225]">
              {items.map((form) => (
                <tr key={form.id} className="hover:bg-[#fcfdfd]">
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#212225]">{form.memberName}</p>
                    <p className="text-xs text-[#53575b]">{form.memberCpf}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700">
                      Poltrona {form.seatNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#53575b]">
                    {form.caravanDepartureDate}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleViewDocument(form.id)}
                      className="text-sm font-semibold text-brand-700 underline hover:text-brand-800"
                    >
                      Abrir Termo Assinado
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={loadingId === form.id}
                        onClick={() => handleEvaluate(form.id, "approved")}
                        className="rounded-lg bg-success-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-success-800 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={loadingId === form.id}
                        onClick={() => handleEvaluate(form.id, "rejected")}
                        className="rounded-lg bg-danger-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-danger-800 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
