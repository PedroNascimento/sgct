import { render, screen } from "@testing-library/react";
import { ReservationStatusPanel } from "@/components/reservation/reservation-status";

describe("ReservationStatusPanel (US-004.5)", () => {
  it("mostra o progresso financeiro e o estágio atual para pago_ala", () => {
    render(<ReservationStatusPanel status="pago_ala" />);

    expect(screen.getByText("Pagamento reconhecido pela Ala", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Progresso da confirmação" })).toBeInTheDocument();
    expect(screen.getByText("Confirmada pela Estaca")).toBeInTheDocument();
    expect(screen.getByText("Pagamento reconhecido pela Ala", { selector: "span" }).closest("li")).toHaveAttribute(
      "aria-current",
      "step"
    );
  });

  it.each([
    ["aguardando_auxilio", "Aguardando aprovação do auxílio"],
    ["aguardando_transferencia_interestaca", "Aguardando transferência entre Estacas"],
    ["lista_espera", "Na lista de espera"],
    ["expirada", "Reserva expirada"],
    ["cancelada_com_credito", "Cancelada com crédito"],
    ["cancelada_sem_credito", "Cancelada sem crédito"],
  ] as const)("explica textualmente o estado especial %s", (status, label) => {
    const { unmount } = render(<ReservationStatusPanel status={status} />);
    expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Progresso da confirmação" })).not.toBeInTheDocument();
    unmount();
  });
});
