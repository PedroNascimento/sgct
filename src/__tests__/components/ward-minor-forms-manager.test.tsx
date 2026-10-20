/**
 * Testes de componente para WardMinorFormsManager (T006.11).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WardMinorFormsManager } from "@/components/admin/ward-minor-forms-manager";
import * as actions from "@/app/(admin)/[estaca_slug]/actions";

jest.mock("@/app/(admin)/[estaca_slug]/actions", () => ({
  evaluateMinorFormAction: jest.fn(),
  getMinorDocumentViewUrlAction: jest.fn(),
}));

describe("WardMinorFormsManager (T006.11)", () => {
  const mockForms = [
    {
      id: "form-1",
      reservationId: "res-1",
      memberName: "João Menor",
      memberCpf: "111.111.111-11",
      seatNumber: 15,
      caravanDepartureDate: "20/11/2026",
      storagePath: "path/to/doc.pdf",
      status: "pending" as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza tabela de formulários pendentes", () => {
    render(<WardMinorFormsManager estacaSlug="natal" forms={mockForms} />);

    expect(screen.getByText("João Menor")).toBeInTheDocument();
    expect(screen.getByText("Poltrona 15")).toBeInTheDocument();
    expect(screen.getByText("20/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
  });

  it("chama evaluateMinorFormAction ao clicar em Aprovar", async () => {
    (actions.evaluateMinorFormAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: "Formulário aprovado com sucesso!",
    });

    render(<WardMinorFormsManager estacaSlug="natal" forms={mockForms} />);

    const approveBtn = screen.getByRole("button", { name: "Aprovar" });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(actions.evaluateMinorFormAction).toHaveBeenCalledWith("natal", "form-1", "approved");
      expect(screen.getByText("Formulário aprovado com sucesso!")).toBeInTheDocument();
      // O item aprovado deve sumir da lista
      expect(screen.queryByText("João Menor")).not.toBeInTheDocument();
    });
  });

  it("abre nova aba com URL assinada ao clicar em Abrir Termo Assinado", async () => {
    window.open = jest.fn();
    (actions.getMinorDocumentViewUrlAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      url: "https://storage.supabase.co/signed/doc.pdf",
    });

    render(<WardMinorFormsManager estacaSlug="natal" forms={mockForms} />);

    const viewDocBtn = screen.getByRole("button", { name: "Abrir Termo Assinado" });
    fireEvent.click(viewDocBtn);

    await waitFor(() => {
      expect(actions.getMinorDocumentViewUrlAction).toHaveBeenCalledWith("form-1");
      expect(window.open).toHaveBeenCalledWith(
        "https://storage.supabase.co/signed/doc.pdf",
        "_blank",
        "noopener,noreferrer"
      );
    });
  });

  it("exibe mensagem amigável quando não houver formulários pendentes", () => {
    render(<WardMinorFormsManager estacaSlug="natal" forms={[]} />);

    expect(
      screen.getByText("Nenhum formulário de menor aguardando avaliação.")
    ).toBeInTheDocument();
  });
});
