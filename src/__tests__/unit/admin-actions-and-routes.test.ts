/**
 * Testes unitários para Server Actions administrativas (createWardAdminAction, confirmWardPaymentAction, validateWeeklyTransfersAction, superAdminSignOutAction)
 */

import {
  createWardAdminAction,
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

  describe("createWardAdminAction", () => {
    it("retorna erro quando o usuário não está autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") });

      const formData = new FormData();
      formData.append("wardId", "ward-123");

      const result = await createWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("retorna erro quando o usuário autenticado não possui role admin_estaca", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "member" },
          },
        },
        error: null,
      });

      const formData = new FormData();
      formData.append("wardId", "ward-123");

      const result = await createWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("requer perfil de Admin da Estaca");
    });

    it("cria o Admin da Ala com sucesso quando acionado por admin_estaca", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-estaca-id",
            app_metadata: { role: "admin_estaca" },
          },
        },
        error: null,
      });

      mockInvoke.mockResolvedValue({
        data: {
          ok: true,
          userId: "ward-admin-new-id",
          profile: { full_name: "Admin da Ala Candelária" },
        },
        error: null,
      });

      const formData = new FormData();
      formData.append("wardId", "ward-123");
      formData.append("email", "admin.ala@teste.com");
      formData.append("fullName", "Admin da Ala Candelária");
      formData.append("password", "SenhaForte123!");
      formData.append("birthDate", "1990-01-01");
      formData.append("sexo", "masculino");

      const result = await createWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("cadastrado com sucesso");
      expect(mockInvoke).toHaveBeenCalledWith("provision-user", expect.objectContaining({
        body: expect.objectContaining({
          operation: "create_ward_admin",
          wardId: "ward-123",
          email: "admin.ala@teste.com",
        }),
      }));
    });

    it("retorna erro quando a edge function retorna falha", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-estaca-id",
            app_metadata: { role: "admin_estaca" },
          },
        },
        error: null,
      });

      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: "A Ala informada não pertence à sua Estaca." },
      });

      const formData = new FormData();
      formData.append("wardId", "ward-outra-estaca");
      formData.append("email", "admin.ala@teste.com");
      formData.append("fullName", "Admin Outra");
      formData.append("password", "Senha123!");
      formData.append("birthDate", "1990-01-01");

      const result = await createWardAdminAction({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("A Ala informada não pertence à sua Estaca");
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
