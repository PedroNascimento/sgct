import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminList } from "@/app/(super-admin)/admins/admin-list";
import { AdminForm } from "@/app/(super-admin)/admins/admin-form";
import { StakeList } from "@/app/(super-admin)/estacas/stake-list";
import { searchMemberByEmailForPromotion, toggleAdminStatusAction, toggleStakeStatusAction, updateAdminRoleAction } from "@/app/(super-admin)/actions";
import type { Stake } from "@/domain/types/tenant";

jest.mock("@/app/(super-admin)/actions", () => ({
  searchMemberByEmailForPromotion: jest.fn(),
  promoteToStakeAdminAction: jest.fn(),
  toggleAdminStatusAction: jest.fn(),
  toggleStakeStatusAction: jest.fn(),
  updateAdminRoleAction: jest.fn(),
}));

const longName = "Administradora com nome completo extenso para conferir leitura e ações no celular";
const admins = Array.from({ length: 12 }, (_, i) => ({
  id: `admin-${i}`, full_name: i === 0 ? longName : `Pessoa ${i}`,
  email: `pessoa-${i}@exemplo.test`, role: "admin_estaca", is_active: true,
  stake_id: "stake-1", stake_name: "Estaca de Homologação com nome extenso",
  stake_slug: "homologacao", created_at: "2026-01-01",
}));
const stakes = Array.from({ length: 12 }, (_, i) => ({
  id: `stake-${i}`, name: `Estaca de Teste ${i}`,
  slug: `estaca-de-teste-${i}`, is_active: i !== 0,
}));

beforeEach(() => jest.clearAllMocks());

it("anuncia o filtro de administradores selecionado e permite limpar uma pesquisa vazia", () => {
  render(<AdminList admins={admins} />);
  const filter = screen.getByRole("button", { name: /^Somente Admins/ });
  fireEvent.click(filter);
  expect(filter).toHaveAttribute("aria-pressed", "true");
  const search = screen.getByRole("searchbox", { name: "Buscar administradores" });
  fireEvent.change(search, { target: { value: "não existe" } });
  expect(screen.getByText(/Nenhum cadastro encontrado/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca e filtros" }));
  expect(screen.getAllByText(longName).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: /^Todos/ })).toHaveAttribute("aria-pressed", "true");
});

it("nomeia paginação e quantidade por página sem perder a navegação existente", () => {
  render(<AdminList admins={admins} />);
  const navigation = screen.getByRole("navigation", { name: "Paginação de administradores" });
  fireEvent.click(within(navigation).getByRole("button", { name: "Próxima página" }));
  expect(screen.getAllByText("Pessoa 11").length).toBeGreaterThan(0);
  expect(screen.queryByText(longName)).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Administradores por página" }), { target: { value: "25" } });
  expect(screen.getAllByText(longName).length).toBeGreaterThan(0);
});

it("mantém busca e filtros de Estacas utilizáveis e anunciados", () => {
  render(<StakeList stakes={stakes} />);
  fireEvent.click(screen.getByRole("button", { name: /^Inativas/ }));
  expect(screen.getByRole("button", { name: /^Inativas/ })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByText("Estaca de Teste 0").length).toBeGreaterThan(0);
  expect(screen.queryByText("Estaca de Teste 1")).not.toBeInTheDocument();
  const search = screen.getByRole("searchbox", { name: "Buscar Estacas" });
  fireEvent.change(search, { target: { value: "sem resultado" } });
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca e filtros" }));
  expect(screen.getByRole("combobox", { name: "Estacas por página" })).toBeInTheDocument();
});

it("cancelar confirmação não altera a conta ou Estaca", () => {
  const view = render(<AdminList admins={admins.slice(0, 1)} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Desativar" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(toggleAdminStatusAction).not.toHaveBeenCalled();
  expect(updateAdminRoleAction).not.toHaveBeenCalled();
  view.unmount();
  render(<StakeList stakes={stakes.slice(0, 1)} />);
  fireEvent.click(screen.getAllByRole("button", { name: /^Ativar/ })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(toggleStakeStatusAction).not.toHaveBeenCalled();
});

it("mostra a pessoa encontrada por inteiro sem colocar seu nome no botão de promoção", async () => {
  jest.mocked(searchMemberByEmailForPromotion).mockResolvedValue({
    id: "member-1", full_name: longName, role: "member", ward_name: "Ala de Teste",
  });
  render(<AdminForm stakes={[{ ...stakes[0], created_at: "2026-01-01" } as Stake]} />);
  fireEvent.change(screen.getByLabelText(/Estaca de Destino/), { target: { value: stakes[0].id } });
  fireEvent.change(screen.getByLabelText(/E-mail do Membro/), { target: { value: "membro@exemplo.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar membro" }));
  await waitFor(() => expect(screen.getByText(longName)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Promover a Admin de Estaca", exact: true })).toBeInTheDocument();
  expect(searchMemberByEmailForPromotion).toHaveBeenCalledWith("membro@exemplo.test", stakes[0].id);
});
