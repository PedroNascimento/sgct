/**
 * Testes de UI/RTL para o Mapa de Assentos (T003.10 e T003.11).
 * Verifica:
 * - Layout fiel do ônibus (fileiras duplas, corredor, motorista, banheiro, 50 assentos).
 * - Assentos ocupados desabilitados e não clicáveis.
 * - Reversão de estado otimista quando a reserva falha por concorrência.
 */

import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeatMap } from "@/components/reservation/seat-map";
import { SeatBookingFlow } from "@/components/reservation/seat-booking-flow";

describe("SeatMap Component (T003.10)", () => {
  it("renderiza todos os 50 assentos, indicação do motorista, banheiro e corredor", () => {
    const handleSelectSeat = jest.fn();
    render(
      <SeatMap
        totalSeats={50}
        occupiedSeats={[3, 4, 15]}
        selectedSeat={null}
        onSelectSeat={handleSelectSeat}
      />
    );

    // Verifica elementos do ônibus
    expect(screen.getByText(/motorista/i)).toBeInTheDocument();
    expect(screen.getByText(/banheiro|wc/i)).toBeInTheDocument();
    expect(screen.getByText(/corredor/i)).toBeInTheDocument();

    // Verifica que 50 poltronas foram renderizadas
    for (let i = 1; i <= 50; i++) {
      expect(screen.getByTestId(`seat-${i}`)).toBeInTheDocument();
    }
  });

  it("não permite clicar em assento ocupado", () => {
    const handleSelectSeat = jest.fn();
    render(
      <SeatMap
        totalSeats={50}
        occupiedSeats={[5, 10]}
        selectedSeat={null}
        onSelectSeat={handleSelectSeat}
      />
    );

    const seat5 = screen.getByTestId("seat-5");
    expect(seat5).toBeDisabled();
    fireEvent.click(seat5);
    expect(handleSelectSeat).not.toHaveBeenCalled();
  });

  it("permite clicar e selecionar um assento livre", () => {
    const handleSelectSeat = jest.fn();
    render(
      <SeatMap
        totalSeats={50}
        occupiedSeats={[5, 10]}
        selectedSeat={null}
        onSelectSeat={handleSelectSeat}
      />
    );

    const seat7 = screen.getByTestId("seat-7");
    expect(seat7).not.toBeDisabled();
    fireEvent.click(seat7);
    expect(handleSelectSeat).toHaveBeenCalledWith(7);
  });
});

describe("SeatBookingFlow Optimistic State Reversion (T003.11)", () => {
  it("reverte a seleção otimista e marca o assento como ocupado quando a reserva falha por concorrência", async () => {
    const mockOnReserve = jest
      .fn()
      .mockRejectedValueOnce(new Error("Assento já ocupado. Por favor, escolha outro assento."));

    render(
      <SeatBookingFlow
        caravanId="test-caravan-id"
        initialOccupiedSeats={[1, 2]}
        onReserveSeat={mockOnReserve}
      />
    );

    // Assento 12 está inicialmente livre
    const seat12 = screen.getByTestId("seat-12");
    expect(seat12).not.toBeDisabled();

    // Usuário seleciona o assento 12
    fireEvent.click(seat12);
    expect(screen.getByTestId("selected-seat-info")).toHaveTextContent("Assento Selecionado: 12");

    // Usuário clica no botão de confirmação da reserva
    const confirmButton = screen.getByRole("button", { name: /confirmar reserva/i });
    fireEvent.click(confirmButton);

    // Deve exibir o erro de concorrência retornado pelo backend
    await waitFor(() => {
      expect(
        screen.getByText(/assento já ocupado\. por favor, escolha outro assento\./i)
      ).toBeInTheDocument();
    });

    // O estado otimista reverteu: a seleção volta para vazio
    expect(screen.getByTestId("selected-seat-info")).not.toHaveTextContent("Assento Selecionado:");

    // E o assento 12 agora deve estar desabilitado (marcado como ocupado para evitar novas tentativas)
    expect(screen.getByTestId("seat-12")).toBeDisabled();
  });
});
