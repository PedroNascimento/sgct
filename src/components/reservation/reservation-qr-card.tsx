"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { ReservationStatus } from "@/domain/types/reservation";
import { requestCheckInTokenAction } from "@/app/(auth)/[estaca_slug]/minhas-reservas/actions";

interface ReservationQrCardProps {
  reservationId: string;
  status: ReservationStatus;
  initialQrToken?: string | null;
  seatNumber: number;
}

export function ReservationQrCard({
  reservationId,
  status,
  initialQrToken,
  seatNumber,
}: ReservationQrCardProps) {
  const [token, setToken] = useState<string | null>(initialQrToken || null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEligible = status === "confirmado" || status === "presente";

  useEffect(() => {
    if (token) {
      QRCode.toDataURL(token, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch(() => setErrorMessage("Erro ao renderizar imagem do QR Code"));
    }
  }, [token]);

  const handleGenerateToken = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await requestCheckInTokenAction(reservationId);
      if (result.success && result.data?.token) {
        setToken(result.data.token);
      } else {
        setErrorMessage(
          result.error || "Não foi possível gerar seu comprovante digital."
        );
      }
    } catch {
      setErrorMessage("Falha de comunicação ao solicitar QR Code.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEligible) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-[#53575b]">
        <p className="font-semibold text-[#212225]">
          Cartão de Embarque Digital
        </p>
        <p className="mt-1 text-xs">
          O QR Code de embarque estará disponível assim que a sua reserva for
          confirmada após a validação financeira da Estaca.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {qrDataUrl ? (
          <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR Code de embarque do assento ${seatNumber}`}
              className="h-44 w-44 object-contain"
            />
            <span className="mt-1.5 text-xs font-bold text-slate-700">
              Assento {seatNumber}
            </span>
          </div>
        ) : (
          <div className="flex h-44 w-44 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-white p-4 text-center">
            <span className="text-xs font-semibold text-emerald-800">
              Comprovante pronto para emissão
            </span>
            <button
              onClick={handleGenerateToken}
              disabled={isLoading}
              className="sgct-button-primary mt-3 text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800"
            >
              {isLoading ? "Gerando..." : "Emitir QR Code"}
            </button>
          </div>
        )}

        <div className="space-y-2 text-center sm:text-left">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            ✓ Cartão de Embarque Liberado
          </span>
          <h4 className="text-base font-bold text-slate-900">
            Apresente este QR Code no embarque
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
            O Líder de Caravana fará a leitura deste código ao entrar no ônibus
            (ida e retorno). Você pode tirar print desta tela ou salvá-la em seu
            aparelho para apresentar mesmo sem internet.
          </p>
          {errorMessage && (
            <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
