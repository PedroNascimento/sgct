/**
 * Testes RTL para o componente SeatSwapManager (T005.10).
 * Spec 005 / US-005.2
 *
 * Verifica que:
 * - Renderiza o formulário para registrar permuta.
 * - Submete o registro com nome do novo passageiro e reserva.
 * - Exibe lista de solicitações com botão de aprovação e executa a aprovação.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeatSwapManager, type SwapRequestWithDetails } from "@/components/admin/seat-swap-manager";
import type { Caravan } from "@/domain/types/caravan";
import type { Reservation } from "@/domain/types/reservation";

describe("SeatSwapManager (T005.10)", () => {
  const caravans: Caravan[] = [
    {
      id: "caravan-1",
      stake_id: "stake-1",
      name: "Caravana Recife Nov",
      departure_date: "2026-11-10T06:00:00Z",
      return_date: "2026-11-11T20:00:00Z",
      total_seats: 50,
      status: "published",
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  const confirmedReservations: Reservation[] = [
    {
      id: "res-1",
      stake_id: "stake-1",
      caravan_id: "caravan-1",
      user_id: "user-1",
      ward_id: "ward-1",
      seat_number: 14,
      boarding_point_id: null,
      category: "standard",
      participant_type: "adulto",
      funding_source: "membro",
      is_preferential_seating: false,
      family_group_member_names: null,
      family_group_label: null,
      companion_for_endowment_name: null,
      status: "confirmado",
      payment_amount: 130,
      confirmed_at: "2026-08-01T10:00:00Z",
      confirmation_rank: 1,
      qr_token: null,
      qr_token_expires_at: null,
      created_at: "2026-08-01T09:00:00Z",
    },
  ];

  const swapRequests: SwapRequestWithDetails[] = [
    {
      id: "swap-1",
      stake_id: "stake-1",
      ward_id: "ward-1",
      original_reservation_id: "res-1",
      new_holder_full_name: "Novo Passageiro Alencar",
      new_holder_document: "111.222.333-44",
      requested_by: "user-1",
      status: "pending",
      created_at: "2026-08-05T10:00:00Z",
      caravan_name: "Caravana Recife Nov",
      seat_number: 14,
    },
  ];

  it("renderiza campos do formulário e solicitações existentes", () => {
    render(
      <SeatSwapManager
        caravans={caravans}
        confirmedReservations={confirmedReservations}
        swapRequests={swapRequests}
        canApprove={true}
        onRegisterSwap={jest.fn()}
        onApproveSwap={jest.fn()}
      />
    );

    expect(screen.getByText("Gestão de Permutas de Assentos")).toBeInTheDocument();
    expect(screen.getByText("Novo Passageiro Alencar")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
  });

  it("chama onRegisterSwap quando formulário é submetido com dados válidos", async () => {
    const onRegisterSwapMock = jest.fn().mockResolvedValue(undefined);

    render(
      <SeatSwapManager
        caravans={caravans}
        confirmedReservations={confirmedReservations}
        swapRequests={[]}
        canApprove={true}
        onRegisterSwap={onRegisterSwapMock}
        onApproveSwap={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Reserva a Permutar/i), {
      target: { value: "res-1" },
    });
    fireEvent.change(screen.getByLabelText(/Nome Completo do Novo Titular/i), {
      target: { value: "Maria de Fátima" },
    });
    fireEvent.change(screen.getByLabelText(/Documento/i), {
      target: { value: "999.888.777-66" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Registrar Permuta" }));

    await waitFor(() => {
      expect(onRegisterSwapMock).toHaveBeenCalledWith({
        reservationId: "res-1",
        newHolderFullName: "Maria de Fátima",
        newHolderDocument: "999.888.777-66",
      });
    });
  });

  it("chama onApproveSwap quando botão Aprovar é clicado", async () => {
    const onApproveSwapMock = jest.fn().mockResolvedValue(undefined);

    render(
      <SeatSwapManager
        caravans={caravans}
        confirmedReservations={confirmedReservations}
        swapRequests={swapRequests}
        canApprove={true}
        onRegisterSwap={jest.fn()}
        onApproveSwap={onApproveSwapMock}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => {
      expect(onApproveSwapMock).toHaveBeenCalledWith("swap-1");
    });
  });
});
