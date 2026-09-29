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
    <div className="mx-auto w-full max-w-xl space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="sgct-alert-danger"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="sgct-alert-success"
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

      <div className="sgct-card flex flex-col items-stretch justify-between gap-4 p-4 sm:flex-row sm:items-center">
        <div data-testid="selected-seat-info">
          {selectedSeat ? (
            <p className="text-base font-semibold text-[#212225]">
              Assento Selecionado:{" "}
              <span className="font-bold text-brand-700">
                {selectedSeat}
              </span>
            </p>
          ) : (
            <p className="text-sm text-[#53575b]">
              Toque em uma poltrona livre no mapa para selecionar seu assento.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!selectedSeat || isSubmitting}
          onClick={handleConfirmReservation}
          className={`sgct-button w-full sm:w-auto ${
            !selectedSeat || isSubmitting
              ? "bg-[#e0e2e2] text-[#676b6e]"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {isSubmitting ? "Confirmando..." : "Confirmar Reserva"}
        </button>
      </div>
    </div>
  );
}
