import { render, screen, fireEvent } from "@testing-library/react";
import { AdminList } from "@/app/(super-admin)/admins/admin-list";

// Mock das Server Actions
jest.mock("@/app/(super-admin)/actions", () => ({
  toggleAdminStatusAction: jest.fn(),
  updateAdminRoleAction: jest.fn(),
}));

describe("AdminList - Paginação e UX Responsiva (Super Admin)", () => {
  // Gerar 25 administradores para testar paginação
  const mockAdmins = Array.from({ length: 25 }, (_, i) => ({
    id: `admin-${i + 1}`,
    full_name: `Administrador Teste ${i + 1}`,
    email: `admin${i + 1}@estaca.org`,
    role: i % 2 === 0 ? "admin_estaca" : "member",
    is_active: true,
    stake_id: `stake-${(i % 3) + 1}`,
    stake_name: `Estaca ${i % 3 === 0 ? "Natal" : i % 3 === 1 ? "Recife" : "João Pessoa"}`,
    stake_slug: `estaca-${i + 1}`,
    created_at: "2026-01-01",
  }));

  it("limita a quantidade de itens na tela de acordo com o pageSize inicial (10)", () => {
    render(<AdminList admins={mockAdmins} />);

    // Deve exibir o primeiro item
    expect(screen.getAllByText("Administrador Teste 1").length).toBeGreaterThanOrEqual(1);
    // Deve exibir o 10º item
    expect(screen.getAllByText("Administrador Teste 10").length).toBeGreaterThanOrEqual(1);
    // NÃO deve exibir o 11º item na página 1
    expect(screen.queryByText("Administrador Teste 11")).not.toBeInTheDocument();

    // Contador no rodapé
    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument(); // 25 itens com pageSize 10 = 3 páginas
  });

  it("navega para a próxima página e página anterior corretamente", () => {
    render(<AdminList admins={mockAdmins} />);

    const nextButton = screen.getByRole("button", { name: /Próxima página/i });
    fireEvent.click(nextButton);

    // Agora está na página 2
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
    expect(screen.getAllByText("Administrador Teste 11").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Administrador Teste 1")).not.toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: /Página anterior/i });
    fireEvent.click(prevButton);

    // Voltou para a página 1
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    expect(screen.getAllByText("Administrador Teste 1").length).toBeGreaterThanOrEqual(1);
  });

  it("permite alterar a quantidade de itens exibidos por página (pageSize)", () => {
    render(<AdminList admins={mockAdmins} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "25" } });

    // Com 25 por página, todos os 25 aparecem em 1 página só
    expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    expect(screen.getAllByText("Administrador Teste 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Administrador Teste 25").length).toBeGreaterThanOrEqual(1);
  });

  it("reseta para a página 1 quando um filtro de busca é aplicado", () => {
    render(<AdminList admins={mockAdmins} />);

    // Ir para a página 2
    const nextButton = screen.getByRole("button", { name: /Próxima página/i });
    fireEvent.click(nextButton);
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();

    // Aplicar filtro de busca
    const searchInput = screen.getByPlaceholderText(/Digite o nome ou e-mail para filtrar/i);
    fireEvent.change(searchInput, { target: { value: "Teste 1" } });

    // Deve voltar para a página 1 dos resultados filtrados
    expect(screen.getByText(/1 \/ /)).toBeInTheDocument();
  });

  it("garante que os botões de ação mobile possuem tamanho de toque acessível (min-h-[48px])", () => {
    render(<AdminList admins={mockAdmins} />);

    const buttons = screen.getAllByRole("button", { name: /Alterar para Padrão|Promover a Admin/i });
    const hasAccessibleTouchTarget = buttons.some((btn) => btn.className.includes("min-h-[48px]"));
    expect(hasAccessibleTouchTarget).toBe(true);
  });
});

