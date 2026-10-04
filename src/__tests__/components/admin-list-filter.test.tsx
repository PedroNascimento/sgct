import { render, screen, fireEvent } from "@testing-library/react";
import { AdminList } from "@/app/(super-admin)/admins/admin-list";
import { WardAdminList } from "@/app/(admin)/[estaca_slug]/estaca/equipe/ward-admin-list";

// Mock das Server Actions
jest.mock("@/app/(super-admin)/actions", () => ({
  toggleAdminStatusAction: jest.fn(),
  updateAdminRoleAction: jest.fn(),
}));

jest.mock("@/app/(admin)/[estaca_slug]/actions", () => ({
  demoteWardAdminAction: jest.fn(),
  promoteWardMemberAction: jest.fn(),
  toggleWardMemberStatusAction: jest.fn(),
}));

describe("AdminList (Super Admin - Busca e Filtros)", () => {
  const mockAdmins = [
    {
      id: "admin-1",
      full_name: "Pedro Nascimento",
      email: "pedro@estaca.org",
      role: "admin_estaca",
      is_active: true,
      stake_id: "stake-1",
      stake_name: "Estaca Natal",
      stake_slug: "natal",
      created_at: "2026-01-01",
    },
    {
      id: "admin-2",
      full_name: "Mariana Pago",
      email: "mariana@natal.org",
      role: "member",
      is_active: true,
      stake_id: "stake-1",
      stake_name: "Estaca Natal",
      stake_slug: "natal",
      created_at: "2026-01-02",
    },
    {
      id: "admin-3",
      full_name: "Carlos Silva",
      email: "carlos@outra.org",
      role: "member",
      is_active: false,
      stake_id: "stake-2",
      stake_name: "Estaca Recife",
      stake_slug: "recife",
      created_at: "2026-01-03",
    },
  ];

  it("renderiza todos os usuários inicialmente (em ambas as visualizações mobile e desktop)", () => {
    render(<AdminList admins={mockAdmins} />);

    expect(screen.getAllByText("Pedro Nascimento").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Mariana Pago").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Carlos Silva").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Todos")).toBeInTheDocument();
  });

  it("filtra a lista em tempo real ao digitar no campo de pesquisa", () => {
    render(<AdminList admins={mockAdmins} />);

    const searchInput = screen.getByPlaceholderText(/Digite o nome ou e-mail para filtrar/i);
    fireEvent.change(searchInput, { target: { value: "Mariana" } });

    expect(screen.getAllByText("Mariana Pago").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Pedro Nascimento")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Silva")).not.toBeInTheDocument();
  });

  it("filtra por Somente Admins e Padrão", () => {
    render(<AdminList admins={mockAdmins} />);

    // Clicar em Somente Admins
    const adminButton = screen.getByRole("button", { name: /Somente Admins/i });
    fireEvent.click(adminButton);

    expect(screen.getAllByText("Pedro Nascimento").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Mariana Pago")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Silva")).not.toBeInTheDocument();

    // Clicar em Padrão (botão de filtro)
    const memberButton = screen.getByRole("button", { name: /^Padrão/i });
    fireEvent.click(memberButton);

    expect(screen.queryByText("Pedro Nascimento")).not.toBeInTheDocument();
    expect(screen.getAllByText("Mariana Pago").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Carlos Silva").length).toBeGreaterThanOrEqual(1);
  });

  it("mostra mensagem quando nenhum cadastro corresponde à busca", () => {
    render(<AdminList admins={mockAdmins} />);

    const searchInput = screen.getByPlaceholderText(/Digite o nome ou e-mail para filtrar/i);
    fireEvent.change(searchInput, { target: { value: "Nome Inexistente" } });

    expect(
      screen.getByText(/Nenhum cadastro encontrado com os filtros aplicados/i)
    ).toBeInTheDocument();
  });
});

describe("WardAdminList (Admin da Estaca - Busca e Filtros)", () => {
  const mockMembers = [
    {
      id: "user-1",
      full_name: "Líder Ala Sul",
      email: "lider@alasul.org",
      role: "admin_ala",
      is_active: true,
      ward_id: "ward-1",
      ward_name: "Ala Sul",
      created_at: "2026-01-01",
    },
    {
      id: "user-2",
      full_name: "Membro Ala Norte",
      email: "membro@alanorte.org",
      role: "member",
      is_active: true,
      ward_id: "ward-2",
      ward_name: "Ala Norte",
      created_at: "2026-01-02",
    },
  ];

  it("renderiza membros e admins da estaca", () => {
    render(<WardAdminList members={mockMembers} />);

    expect(screen.getAllByText("Líder Ala Sul").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Membro Ala Norte").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ala Sul").length).toBeGreaterThanOrEqual(1);
  });

  it("filtra em tempo real ao digitar o nome", () => {
    render(<WardAdminList members={mockMembers} />);

    const searchInput = screen.getByPlaceholderText(/Digite o nome, e-mail ou Ala para filtrar/i);
    fireEvent.change(searchInput, { target: { value: "Líder" } });

    expect(screen.getAllByText("Líder Ala Sul").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Membro Ala Norte")).not.toBeInTheDocument();
  });

  it("exibe o botão 'Alterar para Padrão' apenas para Admin de Ala", () => {
    render(<WardAdminList members={mockMembers} />);

    // Líder Ala Sul tem role 'admin_ala', deve ter botões de alterar para padrão (mobile e desktop)
    const alterButtons = screen.getAllByRole("button", { name: /Alterar para Padrão/i });
    expect(alterButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("exibe o botão 'Promover a Admin' para membros comuns e abre o modal de promoção", () => {
    const mockWards = [
      { id: "ward-1", name: "Ala Sul" },
      { id: "ward-2", name: "Ala Norte" },
    ];
    render(<WardAdminList members={mockMembers} wards={mockWards} />);

    // Membro Ala Norte tem role 'member', deve ter botões de promover a admin
    const promoteButtons = screen.getAllByRole("button", { name: /Promover a Admin/i });
    expect(promoteButtons.length).toBeGreaterThanOrEqual(1);

    // Clicar no botão deve abrir o modal
    fireEvent.click(promoteButtons[0]);
    expect(screen.getByRole("heading", { name: /Promover a Admin de Ala/i })).toBeInTheDocument();
    expect(screen.getByText("Membro selecionado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar Promoção/i })).toBeInTheDocument();
  });
});
