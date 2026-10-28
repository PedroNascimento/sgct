import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StakeList } from "@/app/(super-admin)/estacas/stake-list";
import { toggleStakeStatusAction } from "@/app/(super-admin)/actions";

// Mock das Server Actions
jest.mock("@/app/(super-admin)/actions", () => ({
  toggleStakeStatusAction: jest.fn(),
}));

describe("StakeList (Super Admin - UX/UI de Estacas Cadastradas)", () => {
  const mockStakes = [
    {
      id: "stake-1",
      name: "Estaca Natal Brasil",
      slug: "natal",
      is_active: true,
    },
    {
      id: "stake-2",
      name: "Estaca Recife Sul",
      slug: "recife-sul",
      is_active: true,
    },
    {
      id: "stake-3",
      name: "Estaca João Pessoa",
      slug: "joao-pessoa",
      is_active: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza a seção com contagem total de estacas e colunas principais", () => {
    render(<StakeList stakes={mockStakes} />);

    expect(screen.getByText(/Estacas Cadastradas/i)).toBeInTheDocument();
    expect(screen.getAllByText("Estaca Natal Brasil").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Estaca Recife Sul").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Estaca João Pessoa").length).toBeGreaterThanOrEqual(1);
  });

  it("filtra a lista em tempo real ao buscar por nome ou slug", () => {
    render(<StakeList stakes={mockStakes} />);

    const searchInput = screen.getByPlaceholderText(/Filtrar por nome ou slug/i);
    fireEvent.change(searchInput, { target: { value: "Recife" } });

    expect(screen.getAllByText("Estaca Recife Sul").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Estaca Natal Brasil")).not.toBeInTheDocument();
    expect(screen.queryByText("Estaca João Pessoa")).not.toBeInTheDocument();

    // Busca por slug
    fireEvent.change(searchInput, { target: { value: "joao-pessoa" } });
    expect(screen.getAllByText("Estaca João Pessoa").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Estaca Recife Sul")).not.toBeInTheDocument();
  });

  it("filtra por status (Todas, Ativas, Inativas)", () => {
    render(<StakeList stakes={mockStakes} />);

    // Clicar no filtro de Inativas
    const inactiveFilterBtn = screen.getByRole("button", { name: /^Inativas/i });
    fireEvent.click(inactiveFilterBtn);

    expect(screen.getAllByText("Estaca João Pessoa").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Estaca Natal Brasil")).not.toBeInTheDocument();
    expect(screen.queryByText("Estaca Recife Sul")).not.toBeInTheDocument();

    // Clicar no filtro de Ativas
    const activeFilterBtn = screen.getByRole("button", { name: /^Ativas/i });
    fireEvent.click(activeFilterBtn);

    expect(screen.getAllByText("Estaca Natal Brasil").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Estaca Recife Sul").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Estaca João Pessoa")).not.toBeInTheDocument();
  });

  it("exibe mensagem amigável e botão para limpar filtro quando a busca não retorna resultados", () => {
    render(<StakeList stakes={mockStakes} />);

    const searchInput = screen.getByPlaceholderText(/Filtrar por nome ou slug/i);
    fireEvent.change(searchInput, { target: { value: "Não Existe" } });

    expect(screen.getByText(/Nenhuma estaca encontrada com os filtros aplicados/i)).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: /Limpar busca e filtros/i });
    fireEvent.click(clearButton);

    expect(screen.getAllByText("Estaca Natal Brasil").length).toBeGreaterThanOrEqual(1);
  });

  it("abre modal de confirmação ao clicar em Desativar e chama toggleStakeStatusAction se confirmado", async () => {
    (toggleStakeStatusAction as jest.Mock).mockResolvedValue({
      success: true,
      message: "Estaca desativada com sucesso.",
    });

    render(<StakeList stakes={mockStakes} />);

    // Pegar botões de Desativar
    const desativarButtons = screen.getAllByRole("button", { name: /Desativar/i });
    fireEvent.click(desativarButtons[0]);

    // O modal deve ser exibido com aviso
    expect(screen.getByText(/Desativar Estaca/i)).toBeInTheDocument();

    // Clicar em confirmar
    const confirmButton = screen.getByRole("button", { name: /Sim, Desativar/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toggleStakeStatusAction).toHaveBeenCalledWith("stake-1", false);
    });
  });

  it("renderiza botões de ação com links válidos para abrir página da estaca", () => {
    render(<StakeList stakes={mockStakes} />);

    const links = screen.getAllByRole("link", { name: /Abrir página/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute("href", "/natal");
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("renderiza botões mobile com alvo de toque acessível de no mínimo 48px", () => {
    render(<StakeList stakes={mockStakes} />);

    const mobileButtons = screen.getAllByRole("button", { name: /Desativar/i });
    const has48pxTarget = mobileButtons.some((btn) => btn.className.includes("min-h-[48px]"));
    expect(has48pxTarget).toBe(true);

    const mobileLinks = screen.getAllByRole("link", { name: /Abrir página/i });
    const has48pxLinkTarget = mobileLinks.some((link) => link.className.includes("min-h-[48px]"));
    expect(has48pxLinkTarget).toBe(true);
  });
});
