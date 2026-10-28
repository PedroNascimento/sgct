import { runCronWithLogging } from "./cron-logger";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";

jest.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServiceClient: jest.fn(),
}));

describe("runCronWithLogging (M03 / Observabilidade de Jobs)", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("registra início, sucesso, duração e registros afetados na tabela cron_execution_logs", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: "log-1" }, error: null }),
      }),
    });
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "cron_execution_logs") {
        return { insert: mockInsert, update: mockUpdate };
      }
      return {};
    });

    const result = await runCronWithLogging("test-job", async () => {
      return { success: true, recordsAffected: 5, details: { processed: 5 } };
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job_name: "test-job",
        status: "running",
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        records_affected: 5,
        duration_ms: expect.any(Number),
      })
    );
  });

  it("registra falha com status 'failed' e mensagem de erro ao lançar exceção", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: "log-2" }, error: null }),
      }),
    });
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "cron_execution_logs") {
        return { insert: mockInsert, update: mockUpdate };
      }
      return {};
    });

    await expect(
      runCronWithLogging("failing-job", async () => {
        throw new Error("Erro de infraestrutura simulado");
      })
    ).rejects.toThrow("Erro de infraestrutura simulado");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "Erro de infraestrutura simulado",
        duration_ms: expect.any(Number),
      })
    );
  });
});
