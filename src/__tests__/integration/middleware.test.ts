/**
 * Testes do Middleware de Roteamento Multi-Tenant (T000.14, T000.15, T000.16)
 *
 * Cobre:
 * - T000.16: Rewrite silencioso da raiz "/" para DEFAULT_STAKE
 * - T000.15: Acesso a slug inexistente ou inativo retorna 404
 * - T000.14: Usuário autenticado da Estaca A tentando acessar rota admin da Estaca B retorna 403
 */

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Mock do @supabase/ssr
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("Middleware Multi-Tenant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("T000.16 — Rewrite silencioso da raiz /", () => {
    it("reescreve / para /[DEFAULT_STAKE] preservando a URL", async () => {
      const request = new NextRequest("http://localhost:3000/");

      const response = await middleware(request);

      expect(response.headers.get("x-middleware-rewrite")).toBe(
        "http://localhost:3000/natal"
      );
    });
  });

  describe("T000.15 — Acesso a slug inexistente ou inativo", () => {
    it("retorna 404 quando o slug não existe no banco", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/estaca-inexistente");
      const response = await middleware(request);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toContain("Estaca não encontrada");
    });

    it("retorna 404 quando a Estaca existe mas está inativa (is_active = false)", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "stake-inativa-id", is_active: false },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/estaca-inativa");
      const response = await middleware(request);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toContain("Estaca não encontrada");
    });
  });

  describe("T000.14 — Prevenção de vazamento cross-stake", () => {
    it("redireciona /conta para login quando não há usuário autenticado", async () => {
      const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: STAKE_A_ID, is_active: true },
              error: null,
            }),
          }),
        }),
      });
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await middleware(
        new NextRequest("http://localhost:3000/estaca-a/conta")
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/estaca-a/auth/login"
      );
    });

    it("protege /minhas-reservas quando não há usuário autenticado", async () => {
      const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: STAKE_A_ID, is_active: true },
              error: null,
            }),
          }),
        }),
      });
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await middleware(
        new NextRequest("http://localhost:3000/estaca-a/minhas-reservas")
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/estaca-a/auth/login"
      );
    });

    it.each([
      "/estaca-b/estaca/calendario",
      "/estaca-b/ala/reservas",
    ])("protege a rota administrativa real %s", async (pathname) => {
      const STAKE_B_ID = "00000000-0000-0000-0000-000000000002";
      const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: STAKE_B_ID, is_active: true },
              error: null,
            }),
          }),
        }),
      });
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            app_metadata: {
              stake_id: STAKE_A_ID,
              role: "admin_estaca",
            },
          },
        },
        error: null,
      });

      const response = await middleware(
        new NextRequest(`http://localhost:3000${pathname}`)
      );

      expect(response.status).toBe(403);
    });

    it("retorna 403 quando usuário da Estaca A tenta acessar admin da Estaca B", async () => {
      const STAKE_B_ID = "00000000-0000-0000-0000-000000000002";
      const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";

      // Mock de resolução do slug 'estaca-b' -> STAKE_B_ID
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: STAKE_B_ID, is_active: true },
              error: null,
            }),
          }),
        }),
      });

      // Sessão com claim de stake_id apontando para STAKE_A_ID
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            app_metadata: {
              stake_id: STAKE_A_ID,
              role: "admin_estaca",
            },
          },
        },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/estaca-b/admin/estaca/dashboard"
      );
      const response = await middleware(request);

      expect(response.status).toBe(403);
      const text = await response.text();
      expect(text).toContain("você não pertence a esta Estaca");
    });

    it("retorna 403 quando o token autenticado não possui stake_id", async () => {
      const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: STAKE_A_ID, is_active: true },
              error: null,
            }),
          }),
        }),
      });
      mockGetUser.mockResolvedValue({
        data: { user: { app_metadata: { role: "member" } } },
        error: null,
      });

      const response = await middleware(
        new NextRequest("http://localhost:3000/estaca-a/caravana/minhas-reservas")
      );

      expect(response.status).toBe(403);
    });

    it("permite acesso quando claim.stake_id bate com o slug resolvido", async () => {
      const STAKE_A_ID = "00000000-0000-0000-0000-000000000001";

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: STAKE_A_ID, is_active: true },
              error: null,
            }),
          }),
        }),
      });

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            app_metadata: {
              stake_id: STAKE_A_ID,
              role: "admin_estaca",
            },
          },
        },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/estaca-a/admin/estaca/dashboard"
      );
      const response = await middleware(request);

      // Deve permitir prosseguir (status 200)
      expect(response.status).toBe(200);
    });
  });
});
