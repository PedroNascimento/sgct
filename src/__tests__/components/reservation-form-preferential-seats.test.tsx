import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationForm } from "@/components/reservation/reservation-form";
import type { Profile } from "@/domain/types/tenant";
import type { Caravan, BoardingPoint } from "@/domain/types/caravan";

jest.mock(
  "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions",
  () => ({
    createReservationAction: jest.fn(),
    createGuestReservationAction: jest.fn(),
    addManifestEntryAction: jest.fn(),
    uploadMinorApprovalFormAction: jest.fn(),
  })
);

const PROFILE: Profile = {
  id: "user-uuid-1",
  stake_id: "stake-uuid-1",
  ward_id: "ward-uuid-1",
  role: "member",
  full_name: "Maria da Silva",
  cpf: "12345678900",
  document_type: "RG",
  document_number: "9988776",
  document_issuer: "SSP/RN",
  birth_date: "1980-05-10",
  phone: "84999999999",
  sexo: "feminino",
  is_minor: false,
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
  departure_date: "2026-12-18",
  return_date: "2026-12-19",
  overnight: true,
  price_ticket: 109,
  price_lodging: 26,
  price_standard: 135,
  price_officiant: 122,
  seat_limit: 50,
  waitlist_limit: 5,
  registration_deadline: "2026-12-10",
  min_quorum: 45,
  quorum_check_date: "2026-12-15",
  status: "open",
  caravan_leader_id: null,
  created_by: "admin-uuid-1",
  created_at: new Date().toISOString(),
};

const BOARDING_POINTS: BoardingPoint[] = [
  {
    id: "bp-1",
    caravan_id: "caravan-uuid-1",
    stake_id: "stake-uuid-1",
    name: "Capela Candelária",
    boarding_time: "23:00",
  },
];

describe("ReservationForm — Etapas, Documento Alternativo e Poltronas Preferenciais 01–04 (Spec 016)", () => {
  it("exibe orientações prévias com links oficiais e documento alternativo na Etapa 1", () => {
    render(
      <ReservationForm
        stakeSlug="natal"
        userProfile={PROFILE}
        caravan={CARAVAN}
        boardingPoints={BOARDING_POINTS}
        initialOccupiedSeats={[]}
      />
    );

    expect(screen.getByText(/Etapa 1 de 4/i)).toBeInTheDocument();
    expect(screen.getByText(/RG 9988776 \(SSP\/RN\)/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /agendar ordenanças/i })).toHaveAttribute(
      "href",
      "https://www.churchofjesuschrist.org/temples/schedule/appointment?lang=por"
    );
    expect(screen.getByRole("link", { name: /portal de doações/i })).toHaveAttribute(
      "href",
      "https://www.churchofjesuschrist.org/donations?lang=por"
    );
  });

  it("trava poltronas 05–50 quando Preferencial é marcado e permite apenas 01–04", () => {
    render(
      <ReservationForm
        stakeSlug="natal"
        userProfile={PROFILE}
        caravan={CARAVAN}
        boardingPoints={BOARDING_POINTS}
        initialOccupiedSeats={[1]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /próxima etapa: escolher poltrona/i }));

    // Seleciona poltrona 6 antes de marcar preferencial
    fireEvent.click(screen.getByTestId("seat-6"));
    expect(screen.getByText(/Poltrona 6 selecionada/i)).toBeInTheDocument();

    // Marca preferencial -> limpa poltrona 6, trava 05–50 e mantém 02–04 livres
    fireEvent.click(screen.getByRole("checkbox", { name: /assento preferencial/i }));

    expect(screen.queryByText(/Poltrona 6 selecionada/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("seat-1")).toBeDisabled(); // ocupada
    expect(screen.getByTestId("seat-2")).not.toBeDisabled(); // preferencial livre
    expect(screen.getByTestId("seat-3")).not.toBeDisabled();
    expect(screen.getByTestId("seat-4")).not.toBeDisabled();
    expect(screen.getByTestId("seat-5")).toBeDisabled(); // bloqueada
    expect(screen.getByTestId("seat-6")).toBeDisabled(); // bloqueada
  });

  it("bloqueia a opção Preferencial quando as 4 poltronas (01–04) já estão reservadas", () => {
    render(
      <ReservationForm
        stakeSlug="natal"
        userProfile={PROFILE}
        caravan={CARAVAN}
        boardingPoints={BOARDING_POINTS}
        initialOccupiedSeats={[1, 2, 3, 4]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /próxima etapa: escolher poltrona/i }));

    const prefCheckbox = screen.getByRole("checkbox", { name: /assento preferencial/i });
    expect(prefCheckbox).toBeDisabled();
    expect(screen.getByText(/Todas as 4 poltronas preferenciais \(01 a 04\) já estão reservadas/i)).toBeInTheDocument();
    expect(screen.getByTestId("seat-5")).not.toBeDisabled();
  });
});
