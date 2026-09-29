/**
 * Testes unitários para Server Actions administrativas.
 * Cobre: promoteToWardAdminAction, confirmWardPaymentAction, validateWeeklyTransfersAction,
 * editCaravanAction, confirmSingleTransferAction, rejectTransferAction, superAdminSignOutAction.
 *
 * DECISÃO D32: createWardAdminAction foi substituído por promoteToWardAdminAction.
 * Admins não são criados pelo painel — são membros existentes promovidos.
 */

import {
  promoteToWardAdminAction,
  confirmWardPaymentAction,
  validateWeeklyTransfersAction,
  editCaravanAction,
  confirmSingleTransferAction,
  rejectTransferAction,
} from "@/app/(admin)/[estaca_slug]/actions";
import { superAdminSignOutAction } from "@/app/auth-actions";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { confirmWardPayment } from "@/use-cases/payment/confirm-ward-payment";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { redirect } from "next/navigation";

jest.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/use-cases/payment/confirm-ward-payment", () => ({
  confirmWardPayment: jest.fn(),
}));

jest.mock("@/use-cases/payment/validate-weekly-transfers", () => ({
  validateWeeklyTransfers: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Server Actions Administrativas e de Acesso", () => {
  const mockGetUser = jest.fn();
  const mockInvoke = jest.fn();
  const mockSignOut = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      functions: {
        invoke: mockInvoke,
      },
      from: mockFrom,
    });
  });

  describe("promoteToWardAdminAction", () => {
    it("retorna erro quando o usuário não está autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") });

      const formData = new FormData();
      formData.append("userId", "member-123");
      formData.append("wardId", "ward-123");

      const result = await promoteToWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("retorna erro quando o usuário autenticado não possui role admin_estaca", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "member", stake_id: "stake-123" },
          },
        },
        error: null,
      });

      const formData = new FormData();
      formData.append("userId", "member-456");
      formData.append("wardId", "ward-123");

      const result = await promoteToWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("requer perfil de Admin da Estaca");
    });

    it("retorna erro quando userId ou wardId não são informados", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-estaca-id",
            app_metadata: { role: "admin_estaca", stake_id: "stake-123" },
          },
        },
        error: null,
      });

      const formData = new FormData();
      // sem userId e wardId

      const result = await promoteToWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Selecione um membro válido");
    });

    it("retorna erro quando a Ala não pertence à Estaca do admin", async () => {
      const callerStakeId = "stake-natal";
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-estaca-id",
            app_metadata: { role: "admin_estaca", stake_id: callerStakeId },
          },
        },
        error: null,
      });

      // Mock da listagem de usuários auth (service client)
      const mockServiceListUsers = jest.fn().mockResolvedValue({
        data: { users: [] },
      });
      const mockServiceFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              // Ward pertence a outra Estaca
              data: { id: "ward-outra-estaca", stake_id: "stake-outra", name: "Ala Outra" },
              error: null,
            }),
          }),
        }),
      });
      const mockServiceUpdateUserById = jest.fn();

      jest.doMock("@/infrastructure/supabase/server", () => ({
        createSupabaseServerClient: jest.fn().mockResolvedValue({
          auth: { getUser: mockGetUser },
          from: mockFrom,
        }),
        createSupabaseServiceClient: jest.fn().mockReturnValue({
          from: mockServiceFrom,
          auth: { admin: { listUsers: mockServiceListUsers, updateUserById: mockServiceUpdateUserById } },
        }),
      }));

      const formData = new FormData();
      formData.append("userId", "member-123");
      formData.append("wardId", "ward-outra-estaca");

      const result = await promoteToWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("confirmWardPaymentAction", () => {
    it("falha quando não autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await confirmWardPaymentAction("reservation-123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("chama confirmWardPayment com sucesso", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "admin-ala-id" } },
        error: null,
      });
      (confirmWardPayment as jest.Mock).mockResolvedValue({
        id: "reservation-123",
        status: "pago_ala",
      });

      const result = await confirmWardPaymentAction("reservation-123");
      expect(result.success).toBe(true);
      expect(result.message).toContain("pago_ala");
      expect(confirmWardPayment).toHaveBeenCalledWith(
        { reservationId: "reservation-123", adminId: "admin-ala-id" },
        expect.anything()
      );
    });
  });

  describe("validateWeeklyTransfersAction", () => {
    it("falha quando não autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await validateWeeklyTransfersAction("caravan-123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("chama validateWeeklyTransfers com sucesso", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "admin-estaca-id" } },
        error: null,
      });
      (validateWeeklyTransfers as jest.Mock).mockResolvedValue({
        skipped: false,
        confirmed: [{ id: "res-1" }],
        waitlisted: [],
      });

      const result = await validateWeeklyTransfersAction("caravan-123");
      expect(result.success).toBe(true);
      expect(result.message).toContain("1 assentos confirmados");
      expect(validateWeeklyTransfers).toHaveBeenCalledWith(
        { caravanId: "caravan-123", adminId: "admin-estaca-id" },
        expect.anything()
      );
    });
  });

  describe("superAdminSignOutAction", () => {
    it("faz signOut no Supabase e redireciona para /super-admin/login", async () => {
      await superAdminSignOutAction();

      expect(mockSignOut).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/super-admin/login");
    });
  });

  describe("editCaravanAction", () => {
    it("falha quando usuário não é admin_estaca", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", app_metadata: { role: "member" } } },
        error: null,
      });

      const formData = new FormData();
      formData.append("caravanId", "caravan-123");

      const result = await editCaravanAction({ success: false }, formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Acesso negado");
    });

    it("edita a caravana com sucesso quando solicitada por admin_estaca da mesma Estaca", async () => {
      const stakeId = "stake-123";
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-1",
            app_metadata: { role: "admin_estaca", stake_id: stakeId },
          },
        },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "caravan-123", stake_id: stakeId },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const formData = new FormData();
      formData.append("caravanId", "caravan-123");
      formData.append("departureDate", "2026-11-20");
      formData.append("priceStandard", "150.00");
      formData.append("priceOfficiant", "135.00");
      formData.append("seatLimit", "48");
      formData.append("status", "open");

      const result = await editCaravanAction({ success: false }, formData);
      expect(result.success).toBe(true);
      expect(result.message).toContain("atualizada com sucesso");
    });
  });

  describe("confirmSingleTransferAction e rejectTransferAction", () => {
    const stakeId = "stake-123";

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-1",
            app_metadata: { role: "admin_estaca", stake_id: stakeId },
          },
        },
        error: null,
      });
    });

    it("confirma transferência individual com sucesso para reserva pago_ala", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "res-123", stake_id: stakeId, status: "pago_ala" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await confirmSingleTransferAction("res-123");
      expect(result.success).toBe(true);
      expect(result.message).toContain("confirmada com sucesso");
    });

    it("rejeita e retorna repasse para a Ala reavaliar", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "res-123", stake_id: stakeId, status: "pago_ala" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await rejectTransferAction("res-123");
      expect(result.success).toBe(true);
      expect(result.message).toContain("retornado para a Ala");
    });
  });
});
