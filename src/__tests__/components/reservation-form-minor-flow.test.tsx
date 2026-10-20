/**
 * Testes RTL para o fluxo de autorização de Menor/Jovem no ReservationForm.
 * Spec 006: Quórum, Cancelamento de Caravana e Menores (US-006.3 / T006.10).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReservationForm } from "@/components/reservation/reservation-form";
import type { Profile } from "@/domain/types/tenant";
import type { Caravan, BoardingPoint } from "@/domain/types/caravan";

jest.mock(
  "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions",
  () => ({
    createReservationAction: jest.fn(),
    addManifestEntryAction: jest.fn(),
    uploadMinorApprovalFormAction: jest.fn(),
  })
);

import {
  createReservationAction,
  uploadMinorApprovalFormAction,
} from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";

const mockCreateReservationAction = createReservationAction as jest.MockedFunction<
  typeof createReservationAction
>;
const mockUploadMinorApprovalFormAction = uploadMinorApprovalFormAction as jest.MockedFunction<
  typeof uploadMinorApprovalFormAction
>;

const PROFILE: Profile = {
  id: "user-uuid-1",
  stake_id: "stake-uuid-1",
  ward_id: "ward-uuid-1",
  role: "member",
  full_name: "Jovem Teste",
  cpf: "123.456.789-00",
  birth_date: "2010-05-10",
  phone: "84999999999",
  sexo: "masculino",
  is_minor: true,
  is_active: true,
  home_stake_name: null,
  home_ward_name: null,
  guardian_id: null,
  last_login_at: null,
  created_at: new Date().toISOString(),
};

const CARAVAN: Caravan = {
  id: "caravan-uuid-1",
  stake_id: "stake-uuid-1",
  departure_date: "2026-11-20",
  return_date: "2026-11-22",
  price_standard: 130,
  price_officiant: 90,
  seat_limit: 50,
  waitlist_limit: 5,
  registration_deadline: "2026-11-15",
  min_quorum: 48,
  quorum_check_date: "2026-11-17",
  status: "published",
  created_at: new Date().toISOString(),
};

const BOARDING_POINTS: BoardingPoint[] = [
  {
    id: "bp-1",
    stake_id: "stake-uuid-1",
    name: "Capela Tirol",
    boarding_time: "23:00",
    order: 1,
    created_at: new Date().toISOString(),
  },
];

describe("ReservationForm - Fluxo de Autorização de Menores/Jovens (US-006.3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("não deve exibir campo de autorização de menor para participante Adulto", () => {
    render(
      <ReservationForm
        stakeSlug="natal"
        userProfile={PROFILE}
        caravan={CARAVAN}
        boardingPoints={BOARDING_POINTS}
        initialOccupiedSeats={[]}
      />
    );

    expect(
      screen.queryByText(/Autorização de Menor de Idade/i)
    ).not.toBeInTheDocument();
  });

  it("deve exibir card e campo de upload quando participante for alterado para Jovem", () => {
    render(
      <ReservationForm
        stakeSlug="natal"
        userProfile={PROFILE}
        caravan={CARAVAN}
        boardingPoints={BOARDING_POINTS}
        initialOccupiedSeats={[]}
      />
    );

    const participantSelect = screen.getByLabelText(/Tipo de Participação/i);
    fireEvent.change(participantSelect, { target: { value: "jovem" } });

    expect(
      screen.getByText(/Autorização de Menor de Idade \(12 a 17 anos\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Anexar Termo de Autorização Assinado/i)
    ).toBeInTheDocument();
  });

  it("deve criar a reserva e acionar upload de autorização quando arquivo for selecionado", async () => {
    mockCreateReservationAction.mockResolvedValueOnce({
      success: true,
      data: { id: "reserva-123" } as any,
    });
    mockUploadMinorApprovalFormAction.mockResolvedValueOnce({
      success: true,
      data: { id: "form-123" } as any,
    });

    render(
      <ReservationForm
        stakeSlug="natal"
        userProfile={PROFILE}
        caravan={CARAVAN}
        boardingPoints={BOARDING_POINTS}
        initialOccupiedSeats={[]}
      />
    );

    // 1. Seleciona assento
    const seatBtn = screen.getByTestId("seat-5");
    fireEvent.click(seatBtn);

    // 2. Muda para Jovem
    const participantSelect = screen.getByLabelText(/Tipo de Participação/i);
    fireEvent.change(participantSelect, { target: { value: "jovem" } });

    // 3. Anexa arquivo de teste
    const fileInput = screen.getByLabelText(/Anexar Termo de Autorização Assinado/i);
    const testFile = new File(["dummy pdf content"], "autorizacao_pais.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.getByText(/autorizacao_pais\.pdf/i)).toBeInTheDocument();

    // 4. Confirma a reserva
    const submitBtn = screen.getByRole("button", { name: /Confirmar Minha Reserva/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateReservationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          caravanId: "caravan-uuid-1",
          seatNumber: 5,
          participantType: "jovem",
        })
      );
      expect(mockUploadMinorApprovalFormAction).toHaveBeenCalled();
    });

    // 5. Verifica que a tela de sucesso renderiza o MinorFormUploader
    await waitFor(() => {
      expect(screen.getByText(/Sua reserva foi registrada/i)).toBeInTheDocument();
      expect(screen.getByText(/Aguardando aprovação/i)).toBeInTheDocument();
    });
  });
});
