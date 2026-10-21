import { SupabaseRetentionRepository } from "./supabase-retention-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("SupabaseRetentionRepository", () => {
  let mockSupabase: any;
  let repo: SupabaseRetentionRepository;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
      storage: {
        from: jest.fn().mockReturnValue({
          remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      },
    };
    repo = new SupabaseRetentionRepository(mockSupabase as SupabaseClient);
  });

  it("findExpiredMinorForms busca formulários via RPC get_expired_minor_forms se disponível", async () => {
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: [
        {
          id: "form-rpc-1",
          stake_id: "stake-1",
          storage_path: "stake-1/ward-1/res-1/file.pdf",
          caravan_departure_date: "2026-05-01",
          caravan_return_date: "2026-05-03",
        },
      ],
      error: null,
    });

    const result = await repo.findExpiredMinorForms(new Date("2026-08-01"));

    expect(mockSupabase.rpc).toHaveBeenCalledWith("get_expired_minor_forms", {
      p_cutoff_date: "2026-08-01",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("form-rpc-1");
    expect(result[0].storagePath).toBe("stake-1/ward-1/res-1/file.pdf");
  });

  it("findExpiredMinorForms usa fallback resiliente com COALESCE se RPC não estiver definida", async () => {
    const rawData = [
      {
        id: "form-1",
        stake_id: "stake-1",
        storage_path: "stake-1/ward-1/res-1/file.pdf",
        reservations: {
          caravans: {
            departure_date: "2026-05-01",
            return_date: "2026-05-03",
          },
        },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: rawData, error: null }),
    });

    const result = await repo.findExpiredMinorForms(new Date("2026-08-01"));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("form-1");
    expect(result[0].storagePath).toBe("stake-1/ward-1/res-1/file.pdf");
  });

  it("deleteMinorForm remove registro da tabela", async () => {
    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockSupabase.from.mockReturnValue({ delete: mockDelete });

    await repo.deleteMinorForm("form-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("minor_approval_forms");
  });

  it("deleteFile remove arquivo do storage", async () => {
    await repo.deleteFile("minor-forms", "caminho/do/arquivo.pdf");

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("minor-forms");
  });
});
