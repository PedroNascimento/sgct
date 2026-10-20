/**
 * Testes unitários para MinorFormUploader (T006.10).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MinorFormUploader } from "@/components/reservation/minor-form-uploader";
import * as actions from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";

jest.mock("@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions", () => ({
  uploadMinorApprovalFormAction: jest.fn(),
}));

describe("MinorFormUploader (T006.10)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza o formulário de upload quando o status não for aprovado", () => {
    render(<MinorFormUploader reservationId="res-123" />);

    expect(screen.getByText("Autorização de Menor de Idade (12 a 17 anos)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar Autorização" })).toBeInTheDocument();
  });

  it("rejeita arquivo com extensão inválida no client", () => {
    render(<MinorFormUploader reservationId="res-123" />);

    const input = screen.getByLabelText(/Selecionar Formulário Assinado/i);
    const invalidFile = new File(["malware"], "script.exe", { type: "application/x-msdownload" });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(
      screen.getByText("Formato não suportado. Envie um arquivo PDF, JPEG ou PNG.")
    ).toBeInTheDocument();
  });

  it("chama uploadMinorApprovalFormAction e exibe mensagem de sucesso", async () => {
    (actions.uploadMinorApprovalFormAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { id: "form-1", status: "pending" },
    });

    render(<MinorFormUploader reservationId="res-123" />);

    const input = screen.getByLabelText(/Selecionar Formulário Assinado/i);
    const validFile = new File(["pdf content"], "autorizacao.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [validFile] } });

    const submitBtn = screen.getByRole("button", { name: "Enviar Autorização" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(actions.uploadMinorApprovalFormAction).toHaveBeenCalled();
      expect(
        screen.getByText(/Termo de autorização enviado com sucesso/i)
      ).toBeInTheDocument();
    });
  });

  it("exibe badge de aprovado e esconde formulário quando status for 'approved'", () => {
    render(<MinorFormUploader reservationId="res-123" initialStatus="approved" />);

    expect(screen.getByText("Aprovado pela Ala")).toBeInTheDocument();
    expect(
      screen.getByText("✓ Sua autorização foi conferida e validada pela liderança da Ala.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar Autorização" })).not.toBeInTheDocument();
  });
});
