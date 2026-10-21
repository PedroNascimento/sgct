import { SupabaseNotificationQueueRepository } from "./supabase-notification-queue-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("SupabaseNotificationQueueRepository", () => {
  let mockSupabase: any;
  let repo: SupabaseNotificationQueueRepository;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };
    repo = new SupabaseNotificationQueueRepository(mockSupabase as SupabaseClient);
  });

  it("enqueue insere registro e mapeia camelCase", async () => {
    const rawRow = {
      id: "uuid-1",
      stake_id: "stake-1",
      event_type: "RESERVATION_CONFIRMED_QR",
      recipient_id: "user-1",
      recipient_email: "teste@exemplo.com",
      recipient_name: "Irmão Teste",
      subject: "Assunto",
      payload: { resId: "123" },
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      last_attempt_at: null,
      sent_at: null,
      error_message: null,
      created_at: "2026-10-21T10:00:00Z",
      updated_at: "2026-10-21T10:00:00Z",
    };

    const mockSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: rawRow, error: null }),
    });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await repo.enqueue({
      stakeId: "stake-1",
      eventType: "RESERVATION_CONFIRMED_QR",
      recipientId: "user-1",
      recipientEmail: "teste@exemplo.com",
      recipientName: "Irmão Teste",
      subject: "Assunto",
      payload: { resId: "123" },
    });

    expect(result.id).toBe("uuid-1");
    expect(result.stakeId).toBe("stake-1");
    expect(result.recipientEmail).toBe("teste@exemplo.com");
    expect(mockSupabase.from).toHaveBeenCalledWith("notification_queue");
  });

  it("findRecentDuplicate localiza duplicata nos últimos N minutos", async () => {
    const rawRow = {
      id: "dup-1",
      stake_id: "stake-1",
      event_type: "RESERVATION_CONFIRMED_QR",
      recipient_id: null,
      recipient_email: "teste@exemplo.com",
      recipient_name: null,
      subject: null,
      payload: { reservationId: "res-1" },
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      last_attempt_at: null,
      sent_at: null,
      error_message: null,
      created_at: "2026-10-21T10:00:00Z",
      updated_at: "2026-10-21T10:00:00Z",
    };

    const queryBuilder: any = {};
    queryBuilder.eq = jest.fn().mockReturnValue(queryBuilder);
    queryBuilder.gte = jest.fn().mockReturnValue(queryBuilder);
    queryBuilder.limit = jest.fn().mockResolvedValue({ data: [rawRow], error: null });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue(queryBuilder),
    });

    const duplicate = await repo.findRecentDuplicate(
      "RESERVATION_CONFIRMED_QR",
      "teste@exemplo.com",
      "res-1",
      5
    );

    expect(duplicate?.id).toBe("dup-1");
    expect(mockSupabase.from).toHaveBeenCalledWith("notification_queue");
    expect(queryBuilder.eq).toHaveBeenCalledWith("payload->>reservationId", "res-1");
  });

  it("fetchPending busca itens pendentes ordenados", async () => {
    const rawRow = {
      id: "item-1",
      stake_id: "stake-1",
      event_type: "PAYMENT_PENDING_ALERT",
      recipient_id: null,
      recipient_email: "teste@exemplo.com",
      recipient_name: null,
      subject: null,
      payload: {},
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      created_at: "2026-10-21T10:00:00Z",
      updated_at: "2026-10-21T10:00:00Z",
    };

    const mockLimit = jest.fn().mockResolvedValue({ data: [rawRow], error: null });
    const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const items = await repo.fetchPending(10);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("item-1");
  });

  it("getDailyMetrics chama RPC get_notification_metrics", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          send_date: "2026-10-21",
          total_count: 50,
          sent_count: 48,
          failed_count: 2,
          pending_count: 0,
        },
      ],
      error: null,
    });

    const metrics = await repo.getDailyMetrics("stake-1");
    expect(metrics).toHaveLength(1);
    expect(metrics[0].sendDate).toBe("2026-10-21");
    expect(metrics[0].totalCount).toBe(50);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("get_notification_metrics", {
      p_stake_id: "stake-1",
    });
  });
});
