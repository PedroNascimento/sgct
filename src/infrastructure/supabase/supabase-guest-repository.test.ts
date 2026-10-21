import { SupabaseGuestRepository } from "./supabase-guest-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("SupabaseGuestRepository", () => {
  let mockSupabase: any;
  let repo: SupabaseGuestRepository;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    repo = new SupabaseGuestRepository(mockSupabase as SupabaseClient);
  });

  it("createTransferConfirmation insere e retorna a confirmação", async () => {
    const mockCreated = {
      id: "transfer-123",
      reservation_id: "res-1",
      stake_id: "stake-1",
      origin_stake_name: "Estaca Origem",
      origin_ward_name: "Ala Origem",
      amount: 130,
      confirmed_by: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    };

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockCreated, error: null }),
        }),
      }),
    });

    const result = await repo.createTransferConfirmation({
      reservation_id: "res-1",
      origin_stake_name: "Estaca Origem",
      origin_ward_name: "Ala Origem",
      amount: 130,
    });

    expect(result).toEqual(mockCreated);
    expect(mockSupabase.from).toHaveBeenCalledWith("guest_transfer_confirmations");
  });

  it("findTransferConfirmationById retorna o registro se existir", async () => {
    const mockItem = {
      id: "transfer-123",
      reservation_id: "res-1",
      stake_id: "stake-1",
      origin_stake_name: "Estaca Origem",
      origin_ward_name: "Ala Origem",
      amount: 130,
      confirmed_by: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
        }),
      }),
    });

    const result = await repo.findTransferConfirmationById("transfer-123");
    expect(result).toEqual(mockItem);
  });

  it("confirmTransfer atualiza e retorna o registro confirmado", async () => {
    const mockConfirmed = {
      id: "transfer-123",
      confirmed_by: "admin-1",
      confirmed_at: new Date().toISOString(),
    };

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockConfirmed, error: null }),
          }),
        }),
      }),
    });

    const result = await repo.confirmTransfer("transfer-123", "admin-1");
    expect(result.confirmed_by).toBe("admin-1");
  });
});
