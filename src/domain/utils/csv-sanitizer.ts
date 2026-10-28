/**
 * Utilitário de sanitização e formatação CSV contra CSV Injection / Formula Injection (Spec 009 / M02).
 *
 * Em conformidade com OWASP CSV Injection Defense:
 * Neutraliza células que começam com '=', '+', '-', '@', '\t', '\r',
 * prefixando com apóstrofo (') e encapsulando entre aspas duplas com escape.
 */

const FORMULA_REGEX = /^[=+\-@\t\r]/;

export interface CsvFieldOptions {
  alwaysQuote?: boolean;
}

export function sanitizeCsvField(
  val: unknown,
  options?: CsvFieldOptions
): string {
  if (val === null || val === undefined) {
    return "";
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }

  const str = String(val);
  if (str.length === 0) {
    return "";
  }

  const startsWithFormula = FORMULA_REGEX.test(str);
  const neutralized = startsWithFormula ? `'${str}` : str;
  const hasSpecialChars =
    startsWithFormula ||
    options?.alwaysQuote ||
    neutralized.includes(";") ||
    neutralized.includes('"') ||
    neutralized.includes("\n") ||
    neutralized.includes("\r");

  if (hasSpecialChars) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  return neutralized;
}

export function formatCsvRow(
  fields: unknown[],
  options?: { alwaysQuoteStrings?: boolean }
): string {
  return fields
    .map((field) =>
      typeof field === "string" && field.length > 0 && options?.alwaysQuoteStrings
        ? sanitizeCsvField(field, { alwaysQuote: true })
        : sanitizeCsvField(field)
    )
    .join(";");
}
