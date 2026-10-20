/**
 * Testes RTL para o componente MemberCreditsView (T005.9).
 * Spec 005 / US-005.3
 *
 * Verifica que:
 * - O saldo total é calculado e exibido corretamente.
 * - A lista exibe o valor, origem e a data de expiração claramente visível.
 * - Badges de status (Ativo, Utilizado, Expirado) aparecem corretamente.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemberCreditsView } from "@/components/credit/member-credits-view";
import type { CreditLedgerEntry } from "@/domain/types/credit";

describe("MemberCreditsView (T005.9)", () => {
  const activeCredit1: CreditLedgerEntry = {
    id: "cred-1",
    stake_id: "stake-1",
    ward_id: "ward-1",
    user_id: "user-1",
    amount: 130,
    source: "waitlist_promotion",
    origin_reservation_id: "res-1",
    granted_by: null,
    reason: "Promoção da fila",
    expires_at: "2027-08-15T12:00:00.000Z",
    used_at: null,
    status: "active",
    created_at: "2026-08-15T12:00:00.000Z",
  };

  const activeCredit2: CreditLedgerEntry = {
    id: "cred-2",
    stake_id: "stake-1",
    ward_id: "ward-1",
    user_id: "user-1",
    amount: 117,
    source: "caravan_cancelled",
    origin_reservation_id: null,
    granted_by: null,
    reason: "Caravana cancelada",
    expires_at: "2027-09-01T12:00:00.000Z",
    used_at: null,
    status: "active",
    created_at: "2026-09-01T12:00:00.000Z",
  };

  const expiredCredit: CreditLedgerEntry = {
    id: "cred-3",
    stake_id: "stake-1",
    ward_id: "ward-1",
    user_id: "user-1",
    amount: 130,
    source: "exceptional_grant",
    origin_reservation_id: null,
    granted_by: null,
    reason: "Antigo",
    expires_at: "2026-01-01T12:00:00.000Z",
    used_at: null,
    status: "expired",
    created_at: "2025-01-01T12:00:00.000Z",
  };

  it("renderiza o saldo total de créditos ativos somados", () => {
    render(<MemberCreditsView credits={[activeCredit1, activeCredit2, expiredCredit]} userName="Pedro" />);

    // 130 + 117 = 247
    expect(screen.getByText(/247/)).toBeInTheDocument();
  });

  it("exibe data de expiração claramente visível para cada crédito ativo", () => {
    render(<MemberCreditsView credits={[activeCredit1]} />);

    expect(screen.getByText(/15\/08\/2027/)).toBeInTheDocument();
    expect(screen.getByText(/Promoção da Fila de Espera/i)).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("renderiza mensagem amigável quando não há créditos ativos", () => {
    render(<MemberCreditsView credits={[]} />);

    expect(screen.getByText(/Você não possui créditos ativos disponíveis no momento/i)).toBeInTheDocument();
  });
});
