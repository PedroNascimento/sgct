import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WardsManager } from "@/app/(admin)/[estaca_slug]/estaca/alas/wards-manager";
import type { WardWithStats } from "@/domain/types/ward";
import * as actions from "@/app/(admin)/[estaca_slug]/actions";

jest.mock("@/app/(admin)/[estaca_slug]/actions", () => ({
  createWardAction: jest.fn(),
  updateWardAction: jest.fn(),
  toggleWardStatusAction: jest.fn(),
  deleteWardAction: jest.fn(),
}));

describe("WardsManager Component", () => {
  const mockWards: WardWithStats[] = [
    {
      id: "ward-1111-1111-1111",
      stake_id: "stake-1111-1111-1111",
      name: "Ala Candelária",
      is_active: true,
      created_at: "2026-08-01T12:00:00Z",
      member_count: 24,
      admin_count: 2,
    },
    {
      id: "ward-2222-2222-2222",
      stake_id: "stake-1111-1111-1111",
      name: "Ala Neópolis",
      is_active: true,
      created_at: "2026-08-05T12:00:00Z",
      member_count: 15,
      admin_count: 1,
    },
    {
      id: "ward-3333-3333-3333",
      stake_id: "stake-1111-1111-1111",
      name: "Ramo Parnamirim",
      is_active: false,
      created_at: "2026-08-10T12:00:00Z",
      member_count: 0,
      admin_count: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza métricas e lista de Alas corretamente", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    // Métricas
    expect(screen.getAllByText("3")).toHaveLength(2); // total wards e total admins
    expect(screen.getByText("39")).toBeInTheDocument(); // total members (24 + 15 + 0)
    expect(screen.getByText("Alas e Ramos")).toBeInTheDocument();
    expect(screen.getByText("Lideranças (Admins)")).toBeInTheDocument();
    expect(screen.getByText("Membros Totais")).toBeInTheDocument();

    // Alas na tabela
    expect(screen.getByText("Ala Candelária")).toBeInTheDocument();
    expect(screen.getByText("Ala Neópolis")).toBeInTheDocument();
    expect(screen.getByText("Ramo Parnamirim")).toBeInTheDocument();
    expect(screen.getByText("Sem admin")).toBeInTheDocument();
  });

  it("filtra as Alas pelo status (Todas, Ativas, Inativas)", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    // Clicar em "Inativas"
    const inactiveTab = screen.getByRole("button", { name: /Inativas/i });
    fireEvent.click(inactiveTab);

    expect(screen.getByText("Ramo Parnamirim")).toBeInTheDocument();
    expect(screen.queryByText("Ala Candelária")).not.toBeInTheDocument();
    expect(screen.queryByText("Ala Neópolis")).not.toBeInTheDocument();

    // Clicar em "Ativas"
    const activeTab = screen.getByRole("button", { name: /^Ativas/i });
    fireEvent.click(activeTab);

    expect(screen.getByText("Ala Candelária")).toBeInTheDocument();
    expect(screen.getByText("Ala Neópolis")).toBeInTheDocument();
    expect(screen.queryByText("Ramo Parnamirim")).not.toBeInTheDocument();
  });

  it("filtra as Alas pelo campo de busca em tempo real", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const searchInput = screen.getByLabelText("Filtrar Alas por nome");
    fireEvent.change(searchInput, { target: { value: "Neópolis" } });

    expect(screen.getByText("Ala Neópolis")).toBeInTheDocument();
    expect(screen.queryByText("Ala Candelária")).not.toBeInTheDocument();
    expect(screen.queryByText("Ramo Parnamirim")).not.toBeInTheDocument();
  });

  it("solicita confirmação e inativa uma Ala ativa", async () => {
    (actions.toggleWardStatusAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Ala "Ala Candelária" foi inativada com sucesso.',
    });

    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const inactivateBtn = screen.getByRole("button", { name: "Inativar Ala Ala Candelária" });
    fireEvent.click(inactivateBtn);

    // Modal de confirmação deve aparecer
    expect(screen.getByText("Inativar Ala")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: "Sim, Inativar Ala" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(actions.toggleWardStatusAction).toHaveBeenCalledWith("ward-1111-1111-1111", false);
    });
  });

  it("solicita confirmação e reativa uma Ala inativa", async () => {
    (actions.toggleWardStatusAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Ala "Ramo Parnamirim" foi ativada com sucesso.',
    });

    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const reactivateBtn = screen.getByRole("button", { name: "Reativar Ala Ramo Parnamirim" });
    fireEvent.click(reactivateBtn);

    // Modal de confirmação deve aparecer
    expect(screen.getByText("Reativar Ala")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: "Sim, Reativar Ala" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(actions.toggleWardStatusAction).toHaveBeenCalledWith("ward-3333-3333-3333", true);
    });
  });

  it("bloqueia exclusão de Ala que possui membros e orienta inativar", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const deleteBtn = screen.getByRole("button", { name: "Excluir Ala Ala Candelária" });
    fireEvent.click(deleteBtn);

    // Modal de erro com mensagem explicativa
    expect(screen.getByText("Não é Possível Excluir")).toBeInTheDocument();
    expect(screen.getByText(/24 membro\(s\)/i)).toBeInTheDocument();
    expect(actions.deleteWardAction).not.toHaveBeenCalled();
  });

  it("solicita confirmação e exclui Ala sem membros", async () => {
    (actions.deleteWardAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: "Ala excluída com sucesso.",
    });

    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const deleteBtn = screen.getByRole("button", { name: "Excluir Ala Ramo Parnamirim" });
    fireEvent.click(deleteBtn);

    // Modal de confirmação
    expect(screen.getByText("Excluir Ala Definitivamente")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: "Sim, Excluir Ala" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(actions.deleteWardAction).toHaveBeenCalledWith("ward-3333-3333-3333");
    });
  });
});
