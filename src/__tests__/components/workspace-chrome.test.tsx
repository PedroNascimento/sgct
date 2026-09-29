import { fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceChrome } from "@/components/ui/workspace-chrome";

jest.mock("next/navigation", () => ({ usePathname: () => "/test/calendario" }));
jest.mock("@/app/auth-actions", () => ({ signOutAction: jest.fn(), superAdminSignOutAction: jest.fn() }));

beforeEach(() => localStorage.clear());

it("permite retornar à administração a partir da visão de membro", () => {
  render(<WorkspaceChrome stakeSlug="test" name="Maria" role="admin_estaca" mode="member" />);
  fireEvent.click(screen.getByRole("button", { name: /Abrir opções de perfil/ }));
  expect(screen.getByRole("link", { name: "Voltar à administração" })).toHaveAttribute("href", "/test/estaca/calendario");
  expect(screen.getByRole("link", { name: "Meus dados de perfil" })).toHaveAttribute("href", "/test/conta");
  expect(screen.getByRole("button", { name: "Encerrar sessão" })).toBeInTheDocument();
});

it("permite ao administrador acessar sua visão de membro", () => {
  render(<WorkspaceChrome stakeSlug="test" name="Maria" role="admin_ala" mode="admin" />);
  fireEvent.click(screen.getByRole("button", { name: /Abrir opções de perfil/ }));
  expect(screen.getByRole("link", { name: "Usar visão de membro" })).toHaveAttribute("href", "/test/calendario");
});

it("não oferece acesso administrativo a um membro", () => {
  render(<WorkspaceChrome stakeSlug="test" name="Maria" role="member" mode="member" />);
  fireEvent.click(screen.getByRole("button", { name: /Abrir opções de perfil/ }));
  expect(screen.queryByText("Voltar à administração")).not.toBeInTheDocument();
});

it("salva a preferência de recolhimento e fecha a gaveta com Escape", () => {
  render(<WorkspaceChrome stakeSlug="test" name="Maria" role="member" mode="member" />);
  fireEvent.click(screen.getByRole("button", { name: "Recolher menu lateral" }));
  expect(localStorage.getItem("sgct-sidebar-collapsed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Abrir menu de navegação" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
});
