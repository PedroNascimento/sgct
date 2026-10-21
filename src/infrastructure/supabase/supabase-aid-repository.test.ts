import { SupabaseAidRepository } from "./supabase-aid-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("SupabaseAidRepository (Spec 012)", () => {
  let mockSupabase: jest.Mocked<any>;
  let repository: SupabaseAidRepository;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    repository = new SupabaseAidRepository(mockSupabase as unknown as SupabaseClient);
  });

  it("create insere e retorna pedido de auxílio", async () => {
    const fakeAid = {
      id: "aid-1",
      reservation_id: "res-1",
      aid_type: "auxilio_recem_converso",
      status: "pending",
      requested_by: "user-1",
    };

    const queryBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: fakeAid, error: null }),
    };
    mockSupabase.from.mockReturnValueOnce(queryBuilder);

    const result = await repository.create({
      reservation_id: "res-1",
      aid_type: "auxilio_recem_converso",
      requested_by: "user-1",
    });

    expect(result.id).toBe("aid-1");
    expect(mockSupabase.from).toHaveBeenCalledWith("aid_requests");
  });

  it("findById busca pelo ID", async () => {
    const fakeAid = { id: "aid-1", status: "pending" };
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({ data: fakeAid, error: null }),
    };
    mockSupabase.from.mockReturnValueOnce(queryBuilder);

    const result = await repository.findById("aid-1");
    expect(result?.id).toBe("aid-1");
  });

  it("updateStatus atualiza status e approver", async () => {
    const fakeAid = { id: "aid-1", status: "approved", approved_by: "admin-1" };
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: fakeAid, error: null }),
    };
    mockSupabase.from.mockReturnValueOnce(queryBuilder);

    const result = await repository.updateStatus("aid-1", "approved", "admin-1", "Aprovado");
    expect(result.status).toBe("approved");
  });
});
