import { render, screen, fireEvent } from "@testing-library/react";
import {
  MaskedCpf,
  CpfVisibilityToggle,
  formatCpfDisplay,
} from "@/components/admin/masked-cpf";

describe("CPF Masking Utility (formatCpfDisplay)", () => {
  it("retorna 'Não informado' para valores nulos, indefinidos ou vazios", () => {
    expect(formatCpfDisplay(null, false)).toBe("Não informado");
    expect(formatCpfDisplay(undefined, false)).toBe("Não informado");
    expect(formatCpfDisplay("", false)).toBe("Não informado");
    expect(formatCpfDisplay("   ", false)).toBe("Não informado");
    expect(formatCpfDisplay(null, true)).toBe("Não informado");
  });

  it("mascara CPF de 11 dígitos mostrando apenas os 3 primeiros e o restante com asteriscos", () => {
    // Apenas números
    expect(formatCpfDisplay("05812761400", false)).toBe("058.***.***-**");
    // Já formatado
    expect(formatCpfDisplay("222.333.444-55", false)).toBe("222.***.***-**");
    expect(formatCpfDisplay("123.456.789-01", false)).toBe("123.***.***-**");
  });

  it("exibe o CPF completo e formatado quando isRevealed for true", () => {
    expect(formatCpfDisplay("05812761400", true)).toBe("058.127.614-00");
    expect(formatCpfDisplay("222.333.444-55", true)).toBe("222.333.444-55");
  });
});

describe("MaskedCpf Component", () => {
  it("renderiza CPF mascarado por padrão com botão de revelar", () => {
    const handleToggle = jest.fn();
    render(
      <MaskedCpf
        cpf="05812761400"
        isRevealed={false}
        onToggle={handleToggle}
        memberName="Pedro Nascimento"
      />
    );

    expect(screen.getByText("CPF: 058.***.***-**")).toBeInTheDocument();
    const toggleBtn = screen.getByRole("button", {
      name: /visualizar cpf completo de pedro nascimento/i,
    });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("renderiza CPF completo quando isRevealed for true com botão de ocultar", () => {
    const handleToggle = jest.fn();
    render(
      <MaskedCpf
        cpf="05812761400"
        isRevealed={true}
        onToggle={handleToggle}
        memberName="Pedro Nascimento"
      />
    );

    expect(screen.getByText("CPF: 058.127.614-00")).toBeInTheDocument();
    const toggleBtn = screen.getByRole("button", {
      name: /ocultar cpf de pedro nascimento/i,
    });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("renderiza 'Não informado' sem botão quando CPF for nulo", () => {
    render(
      <MaskedCpf
        cpf={null}
        isRevealed={false}
        onToggle={jest.fn()}
        memberName="Sem CPF"
      />
    );

    expect(screen.getByText("CPF: Não informado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("CpfVisibilityToggle Component (Global)", () => {
  it("renderiza botão para revelar todos quando allRevealed for false", () => {
    const handleToggleAll = jest.fn();
    render(
      <CpfVisibilityToggle allRevealed={false} onToggleAll={handleToggleAll} />
    );

    const btn = screen.getByRole("button", { name: /revelar todos os cpfs/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText("Revelar CPFs")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleToggleAll).toHaveBeenCalledTimes(1);
  });

  it("renderiza botão para ocultar todos quando allRevealed for true", () => {
    const handleToggleAll = jest.fn();
    render(
      <CpfVisibilityToggle allRevealed={true} onToggleAll={handleToggleAll} />
    );

    const btn = screen.getByRole("button", { name: /ocultar todos os cpfs/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText("Ocultar CPFs")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleToggleAll).toHaveBeenCalledTimes(1);
  });
});
