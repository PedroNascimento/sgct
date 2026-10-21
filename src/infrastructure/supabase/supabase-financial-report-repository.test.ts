import { SupabaseFinancialReportRepository } from "./supabase-financial-report-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("SupabaseFinancialReportRepository", () => {
  let mockSupabase: any;
  let repo: SupabaseFinancialReportRepository;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    repo = new SupabaseFinancialReportRepository(mockSupabase as SupabaseClient);
  });

  it("getWardFinancialData agrega reservas da Ala", async () => {
    const mockWard = { id: "ward-1", name: "Ala Sul", stake_id: "stake-1" };
    const mockReservations = [
      {
        id: "res-1",
        status: "confirmado",
        payment_amount: 130.0,
        participant_type: "adulto",
        category: "standard",
        caravans: { departure_date: "2026-11-20" },
        profiles: { full_name: "Pedro Silva" },
      },
      {
        id: "res-2",
        status: "pago_ala",
        payment_amount: 130.0,
        participant_type: "adulto",
        category: "standard",
        caravans: { departure_date: "2026-11-20" },
        profiles: { full_name: "Lucas Lima" },
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "wards") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockWard, error: null }),
            }),
          }),
        };
      }
      if (table === "reservations") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockReservations, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await repo.getWardFinancialData("ward-1");

    expect(result.wardName).toBe("Ala Sul");
    expect(result.totalConfirmed).toBe(1);
    expect(result.totalPagoAla).toBe(1);
    expect(result.totalCollected).toBe(260.0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].passengerName).toBe("Pedro Silva");
  });

  it("getStakeFinancialData consolida por Ala dentro da Estaca", async () => {
    const mockStake = { id: "stake-1", name: "Estaca Natal" };
    const mockWards = [
      { id: "ward-1", name: "Ala Sul", stake_id: "stake-1" },
      { id: "ward-2", name: "Ala Norte", stake_id: "stake-1" },
    ];
    const mockReservations = [
      {
        id: "res-1",
        ward_id: "ward-1",
        status: "confirmado",
        payment_amount: 130.0,
      },
      {
        id: "res-2",
        ward_id: "ward-2",
        status: "confirmado",
        payment_amount: 130.0,
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "stakes") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockStake, error: null }),
            }),
          }),
        };
      }
      if (table === "wards") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockWards, error: null }),
            }),
          }),
        };
      }
      if (table === "reservations") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockReservations, error: null }),
          }),
        };
      }
      return {};
    });

    const result = await repo.getStakeFinancialData("stake-1");

    expect(result.stakeName).toBe("Estaca Natal");
    expect(result.byWard).toHaveLength(2);
    expect(result.totalConfirmed).toBe(2);
    expect(result.totalCollected).toBe(260.0);
  });
});
