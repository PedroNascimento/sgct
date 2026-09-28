"use client";

import React from "react";

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
        className={`w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center transition-all ${
          isOccupied
            ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed line-through shadow-inner"
            : isSelected
            ? "bg-blue-600 text-white border-2 border-blue-700 shadow-md ring-2 ring-blue-300 scale-105"
            : "bg-white text-gray-800 border border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer shadow-sm active:scale-95"
        }`}
      >
        {seatNum}
      </button>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-50 border-2 border-slate-300 rounded-3xl p-4 sm:p-6 shadow-md select-none">
      {/* Frente do Ônibus / Para-brisa */}
      <div className="w-full bg-slate-800 text-slate-200 rounded-2xl py-2 px-4 mb-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
          <span className="text-base">🚌</span>
          <span>Motorista</span>
        </div>
        <div className="text-[10px] uppercase font-semibold text-slate-400">
          Frente / Embarque 🚪
        </div>
      </div>

      {/* Legenda Informativa */}
      <div className="flex items-center justify-around bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 mb-5 shadow-sm">
        <div className="flex items-center space-x-1.5">
          <span className="w-4 h-4 rounded bg-white border border-gray-300 inline-block shadow-sm" />
          <span>Livre</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-4 h-4 rounded bg-blue-600 border border-blue-700 inline-block shadow-sm" />
          <span className="font-semibold text-blue-800">Sua Escolha</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-4 h-4 rounded bg-gray-200 border border-gray-300 inline-block shadow-inner line-through" />
          <span>Ocupado</span>
        </div>
      </div>

      {/* Indicador do Corredor Central */}
      <div className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        Corredor
      </div>

      {/* Mapa de Fileiras */}
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.rowNumber} className="flex items-center justify-between">
            {/* Par de Poltronas Esquerda */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              {row.left.map((seatNum) => renderSeat(seatNum))}
            </div>

            {/* Espaço do Corredor */}
            <div className="w-6 sm:w-8 flex justify-center text-[10px] text-slate-300 font-mono">
              •
            </div>

            {/* Par de Poltronas Direita ou Banheiro */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              {row.right.map((item, idx) => {
                if (item === "wc") {
                  return (
                    <div
                      key="wc"
                      className="w-19 sm:w-21 h-9 sm:h-10 px-2 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm"
                    >
                      WC / Banheiro 🚻
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
      <div className="w-full text-center mt-5 pt-3 border-t border-slate-200 text-xs text-slate-400 font-medium">
        Fundo do Veículo
      </div>
    </div>
  );
}
