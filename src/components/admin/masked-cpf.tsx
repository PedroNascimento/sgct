"use client";

import { Eye, EyeOff } from "lucide-react";

/**
 * Formata um CPF mascarando os dígitos além dos 3 primeiros com `*`,
 * ou revelando o valor completo formatado (000.000.000-00).
 */
export function formatCpfDisplay(
  cpf: string | null | undefined,
  isRevealed: boolean
): string {
  if (!cpf || !cpf.trim()) {
    return "Não informado";
  }

  const digits = cpf.replace(/\D/g, "");

  if (digits.length === 11) {
    if (isRevealed) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }
    return `${digits.slice(0, 3)}.***.***-**`;
  }

  // Fallback caso tenha número irregular de dígitos
  if (digits.length >= 3) {
    if (isRevealed) {
      return cpf;
    }
    return `${digits.slice(0, 3)}${"*".repeat(digits.length - 3)}`;
  }

  return isRevealed ? cpf : "***";
}

interface MaskedCpfProps {
  cpf: string | null | undefined;
  isRevealed: boolean;
  onToggle: () => void;
  memberName?: string;
  className?: string;
  showPrefix?: boolean;
}

/**
 * Componente para exibição protegida de CPF com botão de alternância (olho).
 */
export function MaskedCpf({
  cpf,
  isRevealed,
  onToggle,
  memberName = "membro",
  className = "",
  showPrefix = true,
}: MaskedCpfProps) {
  const hasCpf = Boolean(cpf && cpf.trim());
  const formatted = formatCpfDisplay(cpf, isRevealed);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-sm text-[#53575b]">
        {showPrefix ? `CPF: ${formatted}` : formatted}
      </span>

      {hasCpf && (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#707478] hover:text-brand-900 hover:bg-brand-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          title={
            isRevealed
              ? `Ocultar CPF de ${memberName}`
              : `Visualizar CPF completo de ${memberName}`
          }
          aria-label={
            isRevealed
              ? `Ocultar CPF de ${memberName}`
              : `Visualizar CPF completo de ${memberName}`
          }
        >
          {isRevealed ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      )}
    </span>
  );
}

interface CpfVisibilityToggleProps {
  allRevealed: boolean;
  onToggleAll: () => void;
  className?: string;
}

/**
 * Botão global para alternar a exibição de todos os CPFs da lista de uma só vez.
 */
export function CpfVisibilityToggle({
  allRevealed,
  onToggleAll,
  className = "",
}: CpfVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggleAll}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#d2d6db] bg-white px-3 py-1.5 text-xs font-semibold text-[#3a3d40] hover:bg-[#f0f2f2] transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-500 ${className}`}
      title={
        allRevealed
          ? "Ocultar todos os CPFs da listagem"
          : "Revelar todos os CPFs da listagem"
      }
      aria-label={
        allRevealed
          ? "Ocultar todos os CPFs da listagem"
          : "Revelar todos os CPFs da listagem"
      }
    >
      {allRevealed ? (
        <>
          <EyeOff className="h-3.5 w-3.5 text-[#53575b]" aria-hidden="true" />
          <span>Ocultar CPFs</span>
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5 text-[#53575b]" aria-hidden="true" />
          <span>Revelar CPFs</span>
        </>
      )}
    </button>
  );
}
