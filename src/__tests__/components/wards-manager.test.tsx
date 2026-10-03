import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WardsManager } from "@/app/(admin)/[estaca_slug]/estaca/alas/wards-manager";
import type { WardWithStats } from "@/domain/types/ward";
import * as actions from "@/app/(admin)/[estaca_slug]/actions";

jest.mock("@/app/(admin)/[estaca_slug]/actions", () => ({
  createWardAction: jest.fn(),
  updateWardAction: jest.fn(),
}));

describe("WardsManager Component", () => {
  const mockWards: WardWithStats[] = [
    {
      id: "ward-1111-1111-1111",
      stake_id: "stake-1111-1111-1111",
      name: "Ala Candelária",
      created_at: "2026-08-01T12:00:00Z",
      member_count: 24,
      admin_count: 2,
    },
    {
      id: "ward-2222-2222-2222",
      stake_id: "stake-1111-1111-1111",
      name: "Ala Neópolis",
      created_at: "2026-08-05T12:00:00Z",
      member_count: 15,
      admin_count: 1,
    },
    {
      id: "ward-3333-3333-3333",
      stake_id: "stake-1111-1111-1111",
      name: "Ramo Parnamirim",
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

  it("filtra as Alas pelo campo de busca em tempo real", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const searchInput = screen.getByLabelText("Filtrar Alas por nome");
    fireEvent.change(searchInput, { target: { value: "Neópolis" } });

    expect(screen.getByText("Ala Neópolis")).toBeInTheDocument();
    expect(screen.queryByText("Ala Candelária")).not.toBeInTheDocument();
    expect(screen.queryByText("Ramo Parnamirim")).not.toBeInTheDocument();
  });

  it("abre o modal de criação ao clicar no botão '+ Cadastrar Nova Ala'", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const newBtn = screen.getByRole("button", { name: /Cadastrar Nova Ala/i });
    fireEvent.click(newBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da Ala ou Ramo/i)).toBeInTheDocument();
  });

  it("submete o cadastro de uma nova Ala com sucesso", async () => {
    (actions.createWardAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Ala "Ala Tirol" cadastrada com sucesso!',
    });

    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const newBtn = screen.getByRole("button", { name: /Cadastrar Nova Ala/i });
    fireEvent.click(newBtn);

    const input = screen.getByLabelText(/Nome da Ala ou Ramo/i);
    fireEvent.change(input, { target: { value: "Ala Tirol" } });

    const submitBtn = screen.getByRole("button", { name: "Cadastrar Ala" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(actions.createWardAction).toHaveBeenCalledTimes(1);
    });
  });

  it("abre o modal de edição ao clicar no botão 'Editar'", () => {
    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const editBtns = screen.getAllByRole("button", { name: /Editar Ala/i });
    fireEvent.click(editBtns[0]); // Ala Candelária

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Editar Nome da Ala")).toBeInTheDocument();
    const input = screen.getByLabelText(/Nome da Ala ou Ramo/i) as HTMLInputElement;
    expect(input.value).toBe("Ala Candelária");
  });

  it("submete a edição de uma Ala com sucesso", async () => {
    (actions.updateWardAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Ala "Ala Candelária Norte" atualizada com sucesso!',
    });

    render(<WardsManager initialWards={mockWards} stakeName="Estaca Natal" />);

    const editBtns = screen.getAllByRole("button", { name: /Editar Ala/i });
    fireEvent.click(editBtns[0]); // Ala Candelária

    const input = screen.getByLabelText(/Nome da Ala ou Ramo/i);
    fireEvent.change(input, { target: { value: "Ala Candelária Norte" } });

    const submitBtn = screen.getByRole("button", { name: "Salvar Alterações" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(actions.updateWardAction).toHaveBeenCalledTimes(1);
    });
  });
});
