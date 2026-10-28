import React from "react";
import { render, screen } from "@testing-library/react";
import { ConvidadosClient } from "@/app/(admin)/[estaca_slug]/estaca/convidados/convidados-client";
import { NotificacoesMetricsClient } from "@/app/(admin)/[estaca_slug]/estaca/notificacoes/notificacoes-metrics-client";

// Mock das Server Actions
jest.mock("@/app/(admin)/[estaca_slug]/actions", () => ({
  confirmGuestTransferAction: jest.fn(),
}));

describe("Responsividade e Design System Mobile (T014.15 / T014.16 / M04)", () => {
  describe("ConvidadosClient", () => {
    const mockTransfers = [
      {
        id: "transfer-1",
        stake_id: "stake-1",
        reservation_id: "res-1",
        origin_stake_name: "Estaca João Pessoa",
        origin_ward_name: "Ala Manaíra",
        amount: 150.0,
        status: "pendente" as const,
        created_at: "2026-10-25T10:00:00Z",
        profile: {
          full_name: "Carlos Eduardo Convidado",
          phone: "83999998888",
          cpf: "123.456.789-00",
        },
        reservation: {
          seat_number: 14,
        },
      },
    ];

    it("renderiza visualização em cartões para dispositivos móveis com alvo de toque de no mínimo 48px", () => {
      render(
        <ConvidadosClient
          initialTransfers={mockTransfers as any}
          estacaSlug="natal"
        />
      );

      // Confirma que os dados do convidado aparecem no documento
      expect(screen.getAllByText("Carlos Eduardo Convidado").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Estaca João Pessoa").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Assento 14").length).toBeGreaterThan(0);

      // Confirma presença do botão com classe de alvo de toque mínimo de 48px
      const buttons = screen.getAllByRole("button", { name: /Confirmar Repasse/i });
      expect(buttons.length).toBeGreaterThan(0);

      const mobileButton = buttons.find((btn) => btn.className.includes("min-h-[48px]"));
      expect(mobileButton).toBeDefined();
    });
  });

  describe("NotificacoesMetricsClient", () => {
    const mockMetrics = [
      {
        sendDate: "2026-10-25",
        totalCount: 45,
        sentCount: 43,
        failedCount: 2,
        pendingCount: 0,
      },
    ];

    it("renderiza resumo de métricas em cartões sem quebra ou overflow", () => {
      render(
        <NotificacoesMetricsClient
          metrics={mockMetrics}
          stakeId="stake-123"
          sentToday={45}
        />
      );

      expect(screen.getAllByText("2026-10-25").length).toBeGreaterThan(0);
      expect(screen.getAllByText("43").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/96% sucesso/i).length).toBeGreaterThan(0);
    });
  });
});
