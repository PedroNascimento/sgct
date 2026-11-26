/**
 * Testes RTL para o campo de Agrupamento Familiar no ReservationForm.
 * T002.10 / US-002.3 — Spec 002: Gestão de Caravanas.
 *
 * Verifica que:
 * - O campo family_group_label aparece quando o checkbox de grupo familiar é marcado.
 * - O membro pode digitar um rótulo livre (ex: "Família Silva").
 * - Quando desmarcado, os campos desaparecem.
 * - A action é chamada com o family_group_label informado pelo membro (não gerado automaticamente).
 * - A action é chamada com family_group_label = null quando o checkbox não está marcado.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReservationForm } from "@/components/reservation/reservation-form";
import type { Profile } from "@/domain/types/tenant";
import type { Caravan, BoardingPoint } from "@/domain/types/caravan";

// Mock da Server Action de reserva
jest.mock(
  "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions",
  () => ({
    createReservationAction: jest.fn(),
    addManifestEntryAction: jest.fn(),
  })
);

import {
  createReservationAction,
  addManifestEntryAction,
} from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";

const mockCreateReservationAction = createReservationAction as jest.MockedFunction<
  typeof createReservationAction
>;
const mockAddManifestEntryAction = addManifestEntryAction as jest.MockedFunction<
  typeof addManifestEntryAction
>;

// --- Fixtures ---

const PROFILE: Profile = {
  id: "user-uuid-1",
  stake_id: "stake-uuid-1",
  ward_id: "ward-uuid-1",
  role: "member",
  full_name: "João da Silva",
  cpf: "123.456.789-00",
  birth_date: "1990-05-10",
  phone: "84999999999",
  sexo: "masculino",
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
  departure_date: "2026-11-20",
  return_date: "2026-11-23",
  price_standard: 130.0,
  price_officiant: 117.0,
  seat_limit: 50,
  waitlist_limit: 5,
  registration_deadline: "2026-11-15",
  min_quorum: 48,
  quorum_check_date: "2026-11-17",
  status: "open",
  caravan_leader_id: null,
  created_by: "admin-uuid-1",
  created_at: new Date().toISOString(),
};

const BOARDING_POINT: BoardingPoint = {
  id: "bp-uuid-1",
  caravan_id: "caravan-uuid-1",
  stake_id: "stake-uuid-1",
  name: "Ponto Central",
  boarding_time: "05:00",
};

const DEFAULT_PROPS = {
  stakeSlug: "natal",
  userProfile: PROFILE,
  caravan: CARAVAN,
  boardingPoints: [BOARDING_POINT],
  initialOccupiedSeats: [],
};

// Helpers
function advanceToStep4(seatNumber = 5) {
  fireEvent.click(screen.getByRole("button", { name: /próxima etapa: escolher poltrona/i }));
  fireEvent.click(screen.getByTestId(`seat-${seatNumber}`));
  fireEvent.click(screen.getByRole("button", { name: /próxima etapa: viagem e custeio/i }));
  fireEvent.click(screen.getByRole("button", { name: /próxima etapa: logística e confirmação/i }));
}

function getFamilyGroupCheckbox() {
  return screen.getByRole("checkbox", { name: /viajando com grupo familiar/i });
}

function getFamilyGroupLabelInput() {
  // Usa getByLabelText para ser robusto a mudanças de placeholder
  return screen.getByLabelText(/nome do grupo familiar/i);
}

function getFamilyGroupSizeInput() {
  return screen.getByLabelText(/quantas pessoas irão com você/i);
}

function getFamilyGroupMembersInput() {
  return screen.getByLabelText(/primeiro nome e sobrenome dos familiares/i);
}

// --- Testes ---

describe("ReservationForm — Campo Agrupamento Familiar (T002.10 / US-002.3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("nao exibe o campo de rotulo familiar por padrao (checkbox desmarcado)", () => {
    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4();

    expect(getFamilyGroupCheckbox()).not.toBeChecked();
    expect(
      screen.queryByLabelText(/nome do grupo familiar/i)
    ).not.toBeInTheDocument();
  });

  it("exibe o campo de rotulo do grupo familiar quando o checkbox e marcado", () => {
    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4();

    fireEvent.click(getFamilyGroupCheckbox());

    expect(getFamilyGroupLabelInput()).toBeInTheDocument();
    expect(getFamilyGroupSizeInput()).toBeInTheDocument();
  });

  it("exibe o campo de nomes dos familiares quando o checkbox e marcado", () => {
    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4();

    fireEvent.click(getFamilyGroupCheckbox());

    expect(getFamilyGroupMembersInput()).toBeInTheDocument();
  });

  it("esconde os campos quando o checkbox e desmarcado apos ser marcado", () => {
    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4();

    const checkbox = getFamilyGroupCheckbox();
    fireEvent.click(checkbox); // marca
    expect(getFamilyGroupLabelInput()).toBeInTheDocument();

    fireEvent.click(checkbox); // desmarca
    expect(
      screen.queryByLabelText(/nome do grupo familiar/i)
    ).not.toBeInTheDocument();
  });

  it("nao pre-preenche o rotulo — campo comeca vazio (label e livre, nao automatico)", () => {
    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4();

    fireEvent.click(getFamilyGroupCheckbox());

    const labelInput = getFamilyGroupLabelInput() as HTMLInputElement;
    // Deve estar vazio — o membro preenche, o sistema nao inventa
    expect(labelInput.value).toBe("");
  });

  it("envia family_group_label e familyGroupSize com os valores digitados ao submeter (US-002.3)", async () => {
    mockCreateReservationAction.mockResolvedValueOnce({
      success: true,
      data: { id: "reservation-test-id" },
    });
    mockAddManifestEntryAction.mockResolvedValueOnce({ success: true });

    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4(5);

    // Preenche grupo familiar
    fireEvent.click(getFamilyGroupCheckbox());
    fireEvent.change(getFamilyGroupLabelInput(), {
      target: { value: "Família Nascimento" },
    });
    fireEvent.change(getFamilyGroupSizeInput(), {
      target: { value: "3" },
    });
    fireEvent.change(getFamilyGroupMembersInput(), {
      target: { value: "Esposa Carla e filho Lucas" },
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar minha reserva/i }));

    await waitFor(() => {
      expect(mockCreateReservationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          familyGroupLabel: "Família Nascimento",
          familyGroupSize: 3,
          familyGroupMemberNames: "Esposa Carla e filho Lucas",
        })
      );
    });
  });

  it("envia family_group_label como null quando checkbox nao esta marcado", async () => {
    mockCreateReservationAction.mockResolvedValueOnce({
      success: true,
      data: { id: "reservation-no-family-id" },
    });

    render(<ReservationForm {...DEFAULT_PROPS} />);
    advanceToStep4(7);

    fireEvent.click(screen.getByRole("button", { name: /confirmar minha reserva/i }));

    await waitFor(() => {
      expect(mockCreateReservationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          familyGroupLabel: null,
          familyGroupSize: null,
          familyGroupMemberNames: null,
        })
      );
    });
  });
});
