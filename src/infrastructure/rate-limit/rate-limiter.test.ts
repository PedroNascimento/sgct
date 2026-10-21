/**
 * Testes unitários para o Rate Limiter distribuído (Spec 010 / T010.1 / docs/SECURITY.md)
 * TDD: Red -> Green -> Refactor
 */

import { checkRateLimit, RateLimitExceededError } from "./rate-limiter";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("checkRateLimit (Spec 010 / T010.1)", () => {
  const mockRpc = jest.fn();
  const mockSupabase = {
    rpc: mockRpc,
  } as unknown as SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite a requisição quando o rpc retorna allowed = true", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { allowed: true, current_count: 1 },
      error: null,
    });

    const result = await checkRateLimit("login:user123@example.com", 5, 900, mockSupabase);

    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "login:user123@example.com",
      p_limit: 5,
      p_window_seconds: 900,
    });
  });

  it("retorna allowed = false e retryAfter quando o limite é excedido", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { allowed: false, retry_after: 450, current_count: 5 },
      error: null,
    });

    const result = await checkRateLimit("login:user123@example.com", 5, 900, mockSupabase);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(450);
  });

  it("falha fechada (allowed = false) se a chamada ao rpc retornar erro", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Database connection failed" },
    });

    const result = await checkRateLimit("test-key", 10, 60, mockSupabase);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });

  it("trata inputs vazios ou inválidos bloqueando requisição", async () => {
    const resultEmptyKey = await checkRateLimit("", 5, 60, mockSupabase);
    expect(resultEmptyKey.allowed).toBe(false);

    const resultInvalidLimit = await checkRateLimit("key", 0, 60, mockSupabase);
    expect(resultInvalidLimit.allowed).toBe(false);

    const resultInvalidWindow = await checkRateLimit("key", 5, 0, mockSupabase);
    expect(resultInvalidWindow.allowed).toBe(false);
  });

  it("RateLimitExceededError possui cabeçalho de tempo sugerido e mensagem amigável", () => {
    const error = new RateLimitExceededError("Muitas tentativas.", 120);
    expect(error.name).toBe("RateLimitExceededError");
    expect(error.retryAfter).toBe(120);
    expect(error.message).toBe("Muitas tentativas.");
  });
});
