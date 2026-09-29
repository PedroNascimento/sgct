import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackModal, useFeedbackModal } from "@/components/ui/feedback-modal";

describe("FeedbackModal", () => {
  it("não renderiza nada quando isOpen é false", () => {
    render(
      <FeedbackModal
        isOpen={false}
        title="Título de Teste"
        message="Mensagem de teste"
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByText("Título de Teste")).not.toBeInTheDocument();
  });

  it("renderiza modal de erro com título e mensagem", () => {
    const handleClose = jest.fn();
    render(
      <FeedbackModal
        isOpen={true}
        type="error"
        title="Falha no Processamento"
        message="Detalhes do erro ocorrido"
        onClose={handleClose}
      />
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Falha no Processamento")).toBeInTheDocument();
    expect(screen.getByText("Detalhes do erro ocorrido")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Entendido" });
    fireEvent.click(button);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renderiza modal de confirmação com botões Cancelar e Confirmar", async () => {
    const handleConfirm = jest.fn();
    const handleClose = jest.fn();
    const handleCancel = jest.fn();

    render(
      <FeedbackModal
        isOpen={true}
        type="confirm"
        title="Cancelar Caravana"
        message="Tem certeza que deseja cancelar esta caravana?"
        confirmLabel="Sim, Cancelar"
        cancelLabel="Não, Manter"
        confirmVariant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onClose={handleClose}
      />
    );

    expect(screen.getByText("Cancelar Caravana")).toBeInTheDocument();
    expect(screen.getByText("Tem certeza que deseja cancelar esta caravana?")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Não, Manter" });
    const confirmButton = screen.getByRole("button", { name: "Sim, Cancelar" });

    expect(cancelButton).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();

    // Clicar em confirmar
    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it("fecha ao pressionar a tecla Escape", () => {
    const handleClose = jest.fn();
    render(
      <FeedbackModal
        isOpen={true}
        title="Alerta de Teste"
        message="Mensagem informativa"
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("useFeedbackModal hook", () => {
  function TestConsumer() {
    const { feedbackModal, showConfirm, showError, showSuccess } = useFeedbackModal();

    return (
      <div>
        <button
          onClick={() =>
            showConfirm({
              title: "Confirmar Ação",
              message: "Tem certeza?",
              onConfirm: () => {},
            })
          }
        >
          Abrir Confirmação
        </button>
        <button onClick={() => showError("Mensagem de erro")}>Abrir Erro</button>
        <button onClick={() => showSuccess("Mensagem de sucesso")}>Abrir Sucesso</button>
        {feedbackModal}
      </div>
    );
  }

  it("abre modal de confirmação ao chamar showConfirm", () => {
    render(<TestConsumer />);

    fireEvent.click(screen.getByText("Abrir Confirmação"));
    expect(screen.getByText("Confirmar Ação")).toBeInTheDocument();
    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
  });

  it("abre modal de erro ao chamar showError", () => {
    render(<TestConsumer />);

    fireEvent.click(screen.getByText("Abrir Erro"));
    expect(screen.getByText("Atenção / Erro")).toBeInTheDocument();
    expect(screen.getByText("Mensagem de erro")).toBeInTheDocument();
  });

  it("abre modal de sucesso ao chamar showSuccess", () => {
    render(<TestConsumer />);

    fireEvent.click(screen.getByText("Abrir Sucesso"));
    expect(screen.getByText("Sucesso!")).toBeInTheDocument();
    expect(screen.getByText("Mensagem de sucesso")).toBeInTheDocument();
  });
});
