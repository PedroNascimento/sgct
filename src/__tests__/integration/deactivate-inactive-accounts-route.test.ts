/** @jest-environment node */

import { POST } from "@/app/api/cron/deactivate-inactive-accounts/route";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";

const mockDeactivateInactive = jest.fn();

jest.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServiceClient: jest.fn(() => ({})),
}));

jest.mock("@/infrastructure/supabase/supabase-profile-repository", () => ({
  SupabaseProfileRepository: jest.fn(() => ({
    deactivateInactive: mockDeactivateInactive,
  })),
}));

describe("POST /api/cron/deactivate-inactive-accounts", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    jest.clearAllMocks();
  });

  it("não inicializa service_role sem um CRON_SECRET válido", async () => {
    process.env.CRON_SECRET = "segredo-do-job";

    const response = await POST(new Request("http://localhost/api/cron/deactivate", {
      method: "POST",
      headers: { authorization: "Bearer incorreto" },
    }));

    expect(response.status).toBe(401);
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("executa a inativação após autenticar o job", async () => {
    process.env.CRON_SECRET = "segredo-do-job";
    mockDeactivateInactive.mockResolvedValue({ deactivatedCount: 3 });

    const response = await POST(new Request("http://localhost/api/cron/deactivate", {
      method: "POST",
      headers: { authorization: "Bearer segredo-do-job" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, deactivatedCount: 3 });
  });
});
