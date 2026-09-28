"use client";

import React, { useState } from "react";
import { SeatMap } from "./seat-map";

export interface SeatBookingFlowProps {
  caravanId: string;
  initialOccupiedSeats?: number[];
  onReserveSeat: (seatNumber: number) => Promise<void>;
}

export function SeatBookingFlow({
  caravanId,
  initialOccupiedSeats = [],
  onReserveSeat,
}: SeatBookingFlowProps) {
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>(initialOccupiedSeats);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelectSeat = (seatNumber: number) => {
    setErrorMessage(null);
    setSelectedSeat(seatNumber);
  };

  const handleConfirmReservation = async () => {
    if (!selectedSeat) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const seatAttempted = selectedSeat;

    try {
      await onReserveSeat(seatAttempted);
      setSuccessMessage(`Assento ${seatAttempted} reservado com sucesso!`);
    } catch (err: any) {
      // Reversão de estado otimista: limpa a seleção
      setSelectedSeat(null);

      // Marca o assento como ocupado na visualização local para prevenir novas tentativas
      setOccupiedSeats((prev) =>
        prev.includes(seatAttempted) ? prev : [...prev, seatAttempted]
      );

      const message =
        err?.message || "Assento já ocupado. Por favor, escolha outro assento.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md text-sm text-red-700 shadow-sm"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-4 bg-green-50 border-l-4 border-green-500 rounded-md text-sm text-green-700 shadow-sm"
        >
          {successMessage}
        </div>
      )}

      <SeatMap
        occupiedSeats={occupiedSeats}
        selectedSeat={selectedSeat}
        onSelectSeat={handleSelectSeat}
        disabled={isSubmitting}
      />

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div data-testid="selected-seat-info">
          {selectedSeat ? (
            <p className="text-sm font-semibold text-gray-900">
              Assento Selecionado:{" "}
              <span className="text-blue-600 font-bold text-base">
                {selectedSeat}
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Toque em uma poltrona livre no mapa para selecionar seu assento.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!selectedSeat || isSubmitting}
          onClick={handleConfirmReservation}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium transition shadow-sm ${
            !selectedSeat || isSubmitting
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
          }`}
        >
          {isSubmitting ? "Confirmando..." : "Confirmar Reserva"}
        </button>
      </div>
    </div>
  );
}
