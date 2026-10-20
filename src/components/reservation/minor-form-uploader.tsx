"use client";

import React, { useState } from "react";
import { uploadMinorApprovalFormAction } from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";

export interface MinorFormUploaderProps {
  reservationId: string;
  initialStatus?: "pending" | "approved" | "rejected" | null;
  onUploadSuccess?: () => void;
}

export function MinorFormUploader({
  reservationId,
  initialStatus = null,
  onUploadSuccess,
}: MinorFormUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(initialStatus);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(selected.type)) {
      setErrorMessage("Formato não suportado. Envie um arquivo PDF, JPEG ou PNG.");
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage("O arquivo excede o limite máximo de 10MB.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Por favor, selecione um arquivo.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("reservationId", reservationId);
      formData.append("file", file);

      const result = await uploadMinorApprovalFormAction(formData);

      if (!result.success) {
        setErrorMessage(result.error || "Erro ao enviar termo de autorização.");
      } else {
        setStatus("pending");
        setSuccessMessage("Termo de autorização enviado com sucesso! Aguarde a aprovação do Admin da Ala.");
        setFile(null);
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro inesperado ao enviar.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#e0e2e2] bg-white p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-[#212225]">
            Autorização de Menor de Idade (12 a 17 anos)
          </h3>
          <p className="mt-1 text-sm text-[#53575b]">
            Jovens viajando sem responsável na caravana devem anexar o termo de autorização assinado pelos pais.
          </p>
        </div>
        {status && (
          <span
            className={`sgct-chip ${
              status === "approved"
                ? "border-success-200 bg-success-50 text-success-700"
                : status === "rejected"
                ? "border-danger-200 bg-danger-50 text-danger-700"
                : "border-warning-200 bg-warning-50 text-warning-700"
            }`}
          >
            {status === "approved"
              ? "Aprovado pela Ala"
              : status === "rejected"
              ? "Rejeitado"
              : "Aguardando aprovação"}
          </span>
        )}
      </div>

      {errorMessage && (
        <div role="alert" className="sgct-alert-danger text-sm">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" className="sgct-alert-success text-sm">
          {successMessage}
        </div>
      )}

      {status !== "approved" && (
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="minor-file-input"
              className="block text-sm font-semibold text-[#212225] mb-1"
            >
              Selecionar Formulário Assinado (PDF, JPG ou PNG - máx. 10MB)
            </label>
            <input
              id="minor-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-[#53575b] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="sgct-button-primary disabled:opacity-50"
            >
              {isUploading ? "Enviando arquivo..." : "Enviar Autorização"}
            </button>
          </div>
        </form>
      )}

      {status === "approved" && (
        <p className="text-sm font-semibold text-success-700">
          ✓ Sua autorização foi conferida e validada pela liderança da Ala.
        </p>
      )}
    </div>
  );
}
