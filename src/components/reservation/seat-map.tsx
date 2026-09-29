"use client";

import React from "react";
import { BusIcon } from "@/components/ui/icons";

export interface SeatMapProps {
  totalSeats?: number;
  occupiedSeats: number[];
  selectedSeat: number | null;
  onSelectSeat: (seatNumber: number) => void;
  disabled?: boolean;
}

export function SeatMap({
  totalSeats = 50,
  occupiedSeats = [],
  selectedSeat,
  onSelectSeat,
  disabled = false,
}: SeatMapProps) {
  // Gera a distribuição das 13 fileiras para 50 assentos
  // Fileiras 1-12: 4 assentos cada (48). Fileira 13: 2 assentos (49, 50) + WC
  const rows: {
    rowNumber: number;
    left: number[];
    right: (number | "wc")[];
  }[] = [];

  for (let r = 1; r <= 12; r++) {
    const base = (r - 1) * 4;
    rows.push({
      rowNumber: r,
      left: [base + 1, base + 2],
      right: [base + 3, base + 4],
    });
  }

  // Fileira 13 com assentos 49, 50 e WC
  rows.push({
    rowNumber: 13,
    left: [49, 50],
    right: ["wc"],
  });

  const renderSeat = (seatNum: number) => {
    const isOccupied = occupiedSeats.includes(seatNum);
    const isSelected = selectedSeat === seatNum;

    return (
      <button
        key={seatNum}
        type="button"
        data-testid={`seat-${seatNum}`}
        aria-label={`Poltrona ${seatNum}: ${
          isOccupied ? "Ocupada" : isSelected ? "Selecionada" : "Disponível"
        }`}
        aria-pressed={isSelected}
        disabled={isOccupied || disabled}
        onClick={() => !isOccupied && !disabled && onSelectSeat(seatNum)}
        className={`flex h-11 w-11 items-center justify-center rounded-md text-sm font-bold transition sm:h-12 sm:w-12 ${
          isOccupied
            ? "cursor-not-allowed border border-[#d0d3d3] bg-[#e0e2e2] text-[#676b6e] line-through"
            : isSelected
            ? "border-2 border-brand-900 bg-brand-600 text-white shadow-sm ring-2 ring-brand-200"
            : "cursor-pointer border border-[#9da1a1] bg-white text-[#212225] shadow-sm hover:border-brand-600 hover:bg-brand-50 active:bg-brand-100"
        }`}
      >
        {seatNum}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-md select-none rounded-2xl border-2 border-[#bdc0c0] bg-[#f7f8f8] p-3 shadow-card min-[380px]:p-5 sm:p-6">
      {/* Frente do Ônibus / Para-brisa */}
      <div className="mb-5 flex min-h-12 w-full items-center justify-between rounded-xl bg-brand-900 px-4 py-2 text-white shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <BusIcon className="h-5 w-5" />
          <span>Motorista</span>
        </div>
        <div className="text-xs font-semibold text-brand-100">
          Frente do ônibus
        </div>
      </div>

      {/* Legenda Informativa */}
      <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-[#e0e2e2] bg-white p-3 text-center text-xs font-semibold text-[#53575b] shadow-sm">
        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center">
          <span className="inline-block h-4 w-4 rounded border border-[#9da1a1] bg-white" />
          <span>Disponível</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-brand-700 sm:flex-row sm:justify-center">
          <span className="inline-block h-4 w-4 rounded border border-brand-900 bg-brand-600" />
          <span>Sua escolha</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center">
          <span className="inline-block h-4 w-4 rounded border border-[#d0d3d3] bg-[#e0e2e2] line-through" />
          <span>Ocupado</span>
        </div>
      </div>

      {/* Indicador do Corredor Central */}
      <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-[#676b6e]">
        Corredor
      </div>

      {/* Mapa de Fileiras */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.rowNumber} className="flex items-center justify-between">
            {/* Par de Poltronas Esquerda */}
            <div className="flex items-center gap-1 min-[380px]:gap-1.5">
              {row.left.map((seatNum) => renderSeat(seatNum))}
            </div>

            {/* Espaço do Corredor */}
            <div className="flex w-3 justify-center text-[10px] text-[#bdc0c0] min-[380px]:w-6 sm:w-8">
              <span aria-hidden="true">·</span>
            </div>

            {/* Par de Poltronas Direita ou Banheiro */}
            <div className="flex items-center gap-1 min-[380px]:gap-1.5">
              {row.right.map((item, idx) => {
                if (item === "wc") {
                  return (
                    <div
                      key="wc"
                      className="flex h-11 w-[5.75rem] items-center justify-center rounded-md border border-warning-200 bg-warning-50 px-2 text-center text-[11px] font-bold text-warning-700 sm:h-12 sm:w-[6.25rem]"
                    >
                      Banheiro
                    </div>
                  );
                }
                return renderSeat(item);
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fundo do Ônibus */}
      <div className="mt-5 w-full border-t border-[#e0e2e2] pt-3 text-center text-xs font-semibold text-[#676b6e]">
        Fundo do Veículo
      </div>
    </div>
  );
}
