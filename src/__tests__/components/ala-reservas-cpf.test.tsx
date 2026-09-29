import { render, screen, fireEvent } from "@testing-library/react";
import { AlaReservasClient } from "@/app/(admin)/[estaca_slug]/ala/reservas/ala-reservas-client";

// Mock das Server Actions
jest.mock("@/app/(admin)/[estaca_slug]/actions", () => ({
  confirmWardPaymentAction: jest.fn(),
}));

describe("AlaReservasClient - Proteção e Ocultação de CPF", () => {
  const mockCaravans = [
    {
      id: "caravan-1",
      departure_date: "2026-10-15",
      status: "open",
    },
  ];

  const mockReservations = [
    {
      id: "res-1",
      user_id: "user-1",
      seat_number: 1,
      category: "standard",
      payment_amount: 130,
      status: "pago_ala",
      created_at: "2026-09-01T10:00:00Z",
      caravan_id: "caravan-1",
      profiles: {
        full_name: "Pedro Nascimento",
        cpf: "05812761400",
        phone: "84996219076",
      },
      caravans: {
        id: "caravan-1",
        departure_date: "2026-10-15",
        status: "open",
      },
    },
    {
      id: "res-2",
      user_id: "user-2",
      seat_number: 2,
      category: "standard",
      payment_amount: 150,
      status: "pendente",
      created_at: "2026-09-01T11:00:00Z",
      caravan_id: "caravan-1",
      profiles: {
        full_name: "Carlos Membro",
        cpf: "222.333.444-55",
        phone: "84999990001",
      },
      caravans: {
        id: "caravan-1",
        departure_date: "2026-10-15",
        status: "open",
      },
    },
  ];

  it("exibe inicialmente os CPFs mascarados com os 3 primeiros dígitos e asteriscos", () => {
    render(
      <AlaReservasClient
        currentUserId="admin-user"
        reservations={mockReservations}
        caravans={mockCaravans}
        wardName="Ala Candelária"
      />
    );

    expect(screen.getByText("CPF: 058.***.***-**")).toBeInTheDocument();
    expect(screen.getByText("CPF: 222.***.***-**")).toBeInTheDocument();
    expect(screen.queryByText("CPF: 058.127.614-00")).not.toBeInTheDocument();
    expect(screen.queryByText("CPF: 222.333.444-55")).not.toBeInTheDocument();
  });

  it("permite clicar no olho individual para revelar e ocultar o CPF de um membro específico", () => {
    render(
      <AlaReservasClient
        currentUserId="admin-user"
        reservations={mockReservations}
        caravans={mockCaravans}
        wardName="Ala Candelária"
      />
    );

    const togglePedro = screen.getByRole("button", {
      name: /visualizar cpf completo de pedro nascimento/i,
    });

    // Clica para revelar o CPF de Pedro
    fireEvent.click(togglePedro);
    expect(screen.getByText("CPF: 058.127.614-00")).toBeInTheDocument();
    // Carlos continua mascarado
    expect(screen.getByText("CPF: 222.***.***-**")).toBeInTheDocument();

    // Clica novamente para ocultar
    const hidePedro = screen.getByRole("button", {
      name: /ocultar cpf de pedro nascimento/i,
    });
    fireEvent.click(hidePedro);
    expect(screen.getByText("CPF: 058.***.***-**")).toBeInTheDocument();
  });

  it("permite revelar e ocultar todos os CPFs de uma vez pelo botão global", () => {
    render(
      <AlaReservasClient
        currentUserId="admin-user"
        reservations={mockReservations}
        caravans={mockCaravans}
        wardName="Ala Candelária"
      />
    );

    const globalBtn = screen.getByRole("button", {
      name: /revelar todos os cpfs/i,
    });
    expect(globalBtn).toBeInTheDocument();

    // Clica em Revelar todos
    fireEvent.click(globalBtn);
    expect(screen.getByText("CPF: 058.127.614-00")).toBeInTheDocument();
    expect(screen.getByText("CPF: 222.333.444-55")).toBeInTheDocument();

    // O botão global agora deve indicar que pode ocultar todos
    const hideAllBtn = screen.getByRole("button", {
      name: /ocultar todos os cpfs/i,
    });
    expect(hideAllBtn).toBeInTheDocument();

    // Clica em Ocultar todos
    fireEvent.click(hideAllBtn);
    expect(screen.getByText("CPF: 058.***.***-**")).toBeInTheDocument();
    expect(screen.getByText("CPF: 222.***.***-**")).toBeInTheDocument();
  });
});
