/**
 * Testes unitários para signInAction com Rate Limiting e Validação Zod (Spec 010 / T010.2).
 * Artigo V da Constituição: Validação Zod e Rate Limiting ativo.
 */

import { signInAction } from "@/app/auth-actions";
import * as rateLimiterModule from "@/infrastructure/rate-limit/rate-limiter";
import * as serverSupabaseModule from "@/infrastructure/supabase/server";

jest.mock("@/infrastructure/rate-limit/rate-limiter");
jest.mock("@/infrastructure/supabase/server");

describe("signInAction (Spec 010 / T010.2)", () => {
  const mockCheckRateLimit = rateLimiterModule.checkRateLimit as jest.Mock;
  const mockCreateSupabase = serverSupabaseModule.createSupabaseServerClient as jest.Mock;

  const mockSignInWithPassword = jest.fn();
  const mockSupabase = {
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSupabase.mockResolvedValue(mockSupabase);
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
  });

  it("bloqueia tentativa quando rate limit de login for excedido (5 / 15 min)", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfter: 600,
    });

    const formData = new FormData();
    formData.append("email", "tentativa@exemplo.com");
    formData.append("password", "senha123");
    formData.append("stakeSlug", "natal");

    const result = await signInAction(formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Muitas tentativas de login");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "login:tentativa@exemplo.com",
      5,
      900,
      mockSupabase
    );
  });

  it("rejeita e-mail inválido via Zod antes de chamar banco ou rate limit", async () => {
    const formData = new FormData();
    formData.append("email", "email-invalido");
    formData.append("password", "senha123");

    const result = await signInAction(formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("E-mail inválido");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("autentica e retorna redirectUrl para admin_estaca quando dados válidos", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: "user-1",
          app_metadata: { role: "admin_estaca" },
        },
      },
      error: null,
    });

    const formData = new FormData();
    formData.append("email", "admin@estaca.com");
    formData.append("password", "senhaForte123!");
    formData.append("stakeSlug", "natal");

    const result = await signInAction(formData);

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBe("/natal/estaca/calendario");
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "admin@estaca.com",
      password: "senhaForte123!",
    });
  });

  it("retorna erro amigável se credenciais forem inválidas", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const formData = new FormData();
    formData.append("email", "membro@natal.com");
    formData.append("password", "senhaErrada");
    formData.append("stakeSlug", "natal");

    const result = await signInAction(formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("E-mail ou senha inválidos.");
  });
});
