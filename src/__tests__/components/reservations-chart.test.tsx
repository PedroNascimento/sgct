import { render, screen } from "@testing-library/react";
import { ReservationsChart } from "@/components/ui/reservations-chart";

jest.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  Bar: () => null, BarChart: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
}));

it("mostra estado vazio sem inventar dados", () => {
  render(<ReservationsChart reservations={[]} />);
  expect(screen.getByText("Ainda não há reservas para exibir.")).toBeInTheDocument();
});

it("distingue pagamento na Ala de confirmação e lista de espera", () => {
  render(<ReservationsChart reservations={[{ status: "pago_ala" }, { status: "lista_espera" }, { status: "lista_espera" }]} />);
  expect(screen.getByText("Pago na Ala").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText("Confirmadas").nextElementSibling).toHaveTextContent("0");
  expect(screen.getByText("Lista de espera").nextElementSibling).toHaveTextContent("2");
});
