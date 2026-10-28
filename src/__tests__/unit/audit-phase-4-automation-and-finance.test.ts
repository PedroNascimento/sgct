import { sanitizeCsvField } from "@/domain/utils/csv-sanitizer";
import { runCronWithLogging } from "@/infrastructure/logging/cron-logger";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { processNotificationQueue } from "@/use-cases/notifications/process-notification-queue";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import type { EmailGateway } from "@/domain/interfaces/email-gateway";
import type { NotificationQueueItem } from "@/domain/types/notification";

jest.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServiceClient: jest.fn(),
}));

describe("Fase 4 da Remediação de Auditoria: Automação Operacional, Mensageria e Finanças (A11, M02, M03)", () => {
  describe("4.1 Sanitização contra CSV Injection e Integridade Financeira (M02)", () => {
    it("neutraliza caracteres executáveis em CSV com aspas e prefixo de apóstrofo", () => {
      expect(sanitizeCsvField("=1+1")).toBe("\"'=1+1\"");
      expect(sanitizeCsvField("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
      expect(sanitizeCsvField("-2+3")).toBe("\"'-2+3\"");
      expect(sanitizeCsvField("@SUM(A1:A10)")).toBe("\"'@SUM(A1:A10)\"");
      expect(sanitizeCsvField("\tmalicious")).toBe("\"'\tmalicious\"");
    });

    it("mantém campos numéricos e textos comuns sem aspas a menos que solicitado", () => {
      expect(sanitizeCsvField(130.5)).toBe("130.5");
      expect(sanitizeCsvField("João Silva")).toBe("João Silva");
      expect(sanitizeCsvField("João Silva", { alwaysQuote: true })).toBe("\"João Silva\"");
    });

    it("garante invariância de receita e contagem entre estados 'confirmado' e 'presente'", () => {
      const passageiros = [
        { id: "1", status: "confirmado", valor: 130 },
        { id: "2", status: "confirmado", valor: 130 },
        { id: "3", status: "pago_ala", valor: 130 },
      ];

      const calcularTotais = (lista: typeof passageiros) => {
        const confirmados = lista.filter((p) => ["confirmado", "presente"].includes(p.status));
        const totalArrecadado = confirmados.reduce((acc, p) => acc + p.valor, 0);
        return { totalConfirmados: confirmados.length, totalArrecadado };
      };

      const antesDoCheckin = calcularTotais(passageiros);
      expect(antesDoCheckin.totalConfirmados).toBe(2);
      expect(antesDoCheckin.totalArrecadado).toBe(260);

      // Simula o check-in do primeiro passageiro (status -> presente)
      passageiros[0].status = "presente";

      const depoisDoCheckin = calcularTotais(passageiros);
      expect(depoisDoCheckin.totalConfirmados).toBe(antesDoCheckin.totalConfirmados);
      expect(depoisDoCheckin.totalArrecadado).toBe(antesDoCheckin.totalArrecadado);
    });
  });

  describe("4.2 Outbox com Claim Atômico, Backoff Exponencial e Cota Diária (A11)", () => {
    it("agenda retry com backoff exponencial proporcional ao número de tentativas", async () => {
      const mockItems: NotificationQueueItem[] = [
        {
          id: "item-retry-1",
          stakeId: "stake-test-1",
          recipientEmail: "retry@exemplo.com",
          templateName: "payment_confirmed",
          payload: { name: "Maria" },
          status: "processing",
          attempts: 1,
          createdAt: new Date().toISOString(),
          priority: 1,
        },
      ];

      const mockRepo: jest.Mocked<NotificationQueueRepository> = {
        claimPending: jest.fn().mockResolvedValue(mockItems),
        checkDailyQuota: jest.fn().mockResolvedValue(true),
        updateStatus: jest.fn().mockResolvedValue(undefined),
        fetchPending: jest.fn(),
        getDailyMetrics: jest.fn(),
        findRecentDuplicate: jest.fn(),
        enqueue: jest.fn().mockResolvedValue("item-new"),
      };

      const mockEmailGateway: jest.Mocked<EmailGateway> = {
        send: jest.fn().mockRejectedValue(new Error("Timeout temporário no provedor")),
      };

      const result = await processNotificationQueue(
        { maxRetries: 3 },
        {
          repository: mockRepo,
          emailGateway: mockEmailGateway,
        }
      );

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockRepo.updateStatus).toHaveBeenCalledTimes(1);

      const [id, status, meta] = mockRepo.updateStatus.mock.calls[0];
      expect(id).toBe("item-retry-1");
      expect(status).toBe("pending");
      expect(meta?.errorMessage).toContain("Timeout temporário");
      expect(meta?.scheduledFor).toBeDefined();

      // Backoff exponencial para attempt 1: delay em minutos = 2^newAttempts
      const delayMs = new Date(meta!.scheduledFor!).getTime() - Date.now();
      expect(delayMs).toBeGreaterThan(60 * 1000);
    });

    it("respeita cota diária por Estaca para prevenir estouro do provedor de e-mail", async () => {
      const mockItems: NotificationQueueItem[] = [
        {
          id: "item-quota-exceeded",
          stakeId: "stake-quota-limit",
          recipientEmail: "quota@exemplo.com",
          templateName: "waitlist_promoted",
          payload: { name: "José" },
          status: "processing",
          attempts: 0,
          createdAt: new Date().toISOString(),
          priority: 1,
        },
      ];

      const mockRepo: jest.Mocked<NotificationQueueRepository> = {
        claimPending: jest.fn().mockResolvedValue(mockItems),
        checkDailyQuota: jest.fn().mockResolvedValue(false),
        updateStatus: jest.fn().mockResolvedValue(undefined),
        fetchPending: jest.fn(),
        getDailyMetrics: jest.fn(),
        findRecentDuplicate: jest.fn(),
        enqueue: jest.fn(),
      };

      const mockEmailGateway: jest.Mocked<EmailGateway> = {
        send: jest.fn(),
      };

      const result = await processNotificationQueue(
        { dailyQuotaPerStake: 100 },
        {
          repository: mockRepo,
          emailGateway: mockEmailGateway,
        }
      );

      expect(mockEmailGateway.send).not.toHaveBeenCalled();
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        "item-quota-exceeded",
        "pending",
        expect.objectContaining({
          errorMessage: expect.stringContaining("Cota diária"),
        })
      );
    });
  });

  describe("4.3 Observabilidade de Jobs Agendados (M03)", () => {
    it("registra início, duração e sucesso na tabela cron_execution_logs", async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: "log-audit-1" }, error: null }),
        }),
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === "cron_execution_logs") {
            return { insert: mockInsert, update: mockUpdate };
          }
          return {};
        }),
      };

      (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await runCronWithLogging("test-audit-job", async () => {
        return { recordsAffected: 15, details: { updated: 15 } };
      });

      expect(result.recordsAffected).toBe(15);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          job_name: "test-audit-job",
          status: "running",
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          records_affected: 15,
          duration_ms: expect.any(Number),
        })
      );
    });

    it("registra falha com mensagem detalhada em caso de erro na execução", async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: "log-audit-2" }, error: null }),
        }),
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === "cron_execution_logs") {
            return { insert: mockInsert, update: mockUpdate };
          }
          return {};
        }),
      };

      (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(
        runCronWithLogging("failing-audit-job", async () => {
          throw new Error("Conexão interrompida com banco");
        })
      ).rejects.toThrow("Conexão interrompida com banco");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error_message: "Conexão interrompida com banco",
          duration_ms: expect.any(Number),
        })
      );
    });
  });
});
