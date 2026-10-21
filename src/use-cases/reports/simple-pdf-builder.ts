/**
 * Construtor leve e puro de documentos PDF para relatórios (Spec 009 / T009.3).
 * Artigo I: puro TypeScript sem dependências nativas pesadas.
 * Produz documentos PDF 1.4 válidos em padrão A4.
 */

export interface PdfTextLine {
  text: string;
  size?: number;
  isBold?: boolean;
  align?: "left" | "center" | "right";
  marginTop?: number;
}

export function buildSimplePdf(title: string, lines: string[]): Buffer {
  const sanitize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos para fonte Type1 padrão
      .replace(/[\\()]/g, ""); // escapa parênteses

  const streamLines: string[] = [];
  streamLines.push("BT");
  streamLines.push("/F1 16 Tf");
  streamLines.push("50 800 Td");
  streamLines.push(`(${sanitize(title)}) Tj`);
  streamLines.push("ET");

  let y = 770;
  streamLines.push("BT");
  streamLines.push("/F1 10 Tf");

  for (const line of lines) {
    if (y < 50) {
      // Limite simples de página para MVP
      break;
    }
    streamLines.push(`1 0 0 1 50 ${y} Tm`);
    streamLines.push(`(${sanitize(line)}) Tj`);
    y -= 14;
  }

  streamLines.push("ET");

  const streamContent = streamLines.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  const objects: string[] = [];

  // Objeto 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Objeto 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");

  // Objeto 3: Page (A4: 595.28 x 841.89)
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj"
  );

  // Objeto 4: Font (Helvetica)
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  );

  // Objeto 5: Contents
  objects.push(
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`
  );

  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(output, "utf-8"));
    output += obj + "\n";
  }

  const xrefStart = Buffer.byteLength(output, "utf-8");
  output += "xref\n";
  output += `0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i++) {
    output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  output += "trailer\n";
  output += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  output += "startxref\n";
  output += `${xrefStart}\n`;
  output += "%%EOF\n";

  return Buffer.from(output, "utf-8");
}
