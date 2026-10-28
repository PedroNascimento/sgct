import { sanitizeCsvField, formatCsvRow } from "./csv-sanitizer";

describe("csv-sanitizer (M02 / CSV Injection Defense)", () => {
  it("retorna string vazia para null ou undefined", () => {
    expect(sanitizeCsvField(null)).toBe("");
    expect(sanitizeCsvField(undefined)).toBe("");
  });

  it("converte números e booleanos sem alteração", () => {
    expect(sanitizeCsvField(123.45)).toBe("123.45");
    expect(sanitizeCsvField(0)).toBe("0");
    expect(sanitizeCsvField(true)).toBe("true");
  });

  it("mantém strings comuns inalteradas ou entre aspas se contiverem delimitador", () => {
    expect(sanitizeCsvField("Pedro Silva")).toBe("Pedro Silva");
    expect(sanitizeCsvField("Ala Neópolis; Bloco A")).toBe('"Ala Neópolis; Bloco A"');
  });

  it("neutraliza fórmulas maliciosas iniciadas por '=', '+', '-', '@'", () => {
    expect(sanitizeCsvField("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
    expect(sanitizeCsvField("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
    expect(sanitizeCsvField("-10+20")).toBe("\"'-10+20\"");
    expect(sanitizeCsvField("@SUM(1,2)")).toBe("\"'@SUM(1,2)\"");
  });

  it("neutraliza caracteres de controle no início da string (\\t, \\r)", () => {
    expect(sanitizeCsvField("\t=calc")).toBe("\"'\t=calc\"");
    expect(sanitizeCsvField("\r=calc")).toBe("\"'\r=calc\"");
  });

  it("escapa aspas duplas internas corretamente", () => {
    expect(sanitizeCsvField('Nome com "Aspas"')).toBe('"Nome com ""Aspas"""');
  });

  it("formatCsvRow monta linha delimitada por ponto-e-vírgula com sanitização em todos os campos", () => {
    const row = formatCsvRow([
      "1",
      "=cmd|' /C calc'!A0",
      "Carlos Souza",
      150.0,
      "confirmado",
    ]);
    expect(row).toBe("1;\"'=cmd|' /C calc'!A0\";Carlos Souza;150;confirmado");
  });
});
