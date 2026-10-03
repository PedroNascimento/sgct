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
  createCaravanAction,
  createWardAction,
  updateWardAction,
  toggleWardStatusAction,
  deleteWardAction,
} from "@/app/(admin)/[estaca_slug]/actions";
import { superAdminSignOutAction } from "@/app/auth-actions";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { confirmWardPayment } from "@/use-cases/payment/confirm-ward-payment";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { createCaravan } from "@/use-cases/caravan/create-caravan";
import { createWard } from "@/use-cases/ward/create-ward";
import { updateWard } from "@/use-cases/ward/update-ward";
import { toggleWardStatus } from "@/use-cases/ward/toggle-ward-status";
import { deleteWard } from "@/use-cases/ward/delete-ward";
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

jest.mock("@/use-cases/caravan/create-caravan", () => ({
  createCaravan: jest.fn(),
}));

jest.mock("@/use-cases/ward/create-ward", () => ({
  createWard: jest.fn(),
}));

jest.mock("@/use-cases/ward/update-ward", () => ({
  updateWard: jest.fn(),
}));

jest.mock("@/use-cases/ward/toggle-ward-status", () => ({
  toggleWardStatus: jest.fn(),
}));

jest.mock("@/use-cases/ward/delete-ward", () => ({
  deleteWard: jest.fn(),
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

  describe("createCaravanAction", () => {
    const adminId = "admin-estaca-1";

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminId,
            app_metadata: { role: "admin_estaca", stake_id: "stake-natal" },
          },
        },
        error: null,
      });

      (createCaravan as jest.Mock).mockResolvedValue({
        id: "caravan-new-123",
        departure_date: "2026-10-16",
        status: "open",
      });
    });

    it("lê e processa pontos de embarque enviados via campo 'boardingPoints'", async () => {
      const formData = new FormData();
      formData.append("departureDate", "2026-10-16");
      formData.append("returnDate", "2026-10-17");
      formData.append("priceStandard", "130");
      formData.append("priceOfficiant", "122");
      formData.append("seatLimit", "50");
      formData.append("waitlistLimit", "5");
      formData.append("registrationDeadline", "2026-10-11");
      formData.append("minQuorum", "48");
      formData.append("quorumCheckDate", "2026-10-13");
      formData.append(
        "boardingPoints",
        JSON.stringify([
          { name: "Capela Tirol", boardingTime: "2026-10-16T19:00" },
          { name: "Capela Potengi", boardingTime: "2026-10-16T19:30" },
        ])
      );

      const result = await createCaravanAction({ success: false }, formData);

      expect(result.success).toBe(true);
      expect(createCaravan).toHaveBeenCalledWith(
        expect.objectContaining({
          departureDate: "2026-10-16",
          boardingPoints: [
            { name: "Capela Tirol", boardingTime: "2026-10-16T19:00" },
            { name: "Capela Potengi", boardingTime: "2026-10-16T19:30" },
          ],
        }),
        adminId,
        expect.any(Object)
      );
    });

    it("lê e processa pontos de embarque enviados via campo 'boardingPointsJson'", async () => {
      const formData = new FormData();
      formData.append("departureDate", "2026-10-16");
      formData.append("priceStandard", "130");
      formData.append("priceOfficiant", "122");
      formData.append("registrationDeadline", "2026-10-11");
      formData.append("quorumCheckDate", "2026-10-13");
      formData.append(
        "boardingPointsJson",
        JSON.stringify([
          { name: "Capela Principal", boardingTime: "2026-10-16T18:00" },
        ])
      );

      const result = await createCaravanAction({ success: false }, formData);

      expect(result.success).toBe(true);
      expect(createCaravan).toHaveBeenCalledWith(
        expect.objectContaining({
          boardingPoints: [
            { name: "Capela Principal", boardingTime: "2026-10-16T18:00" },
          ],
        }),
        adminId,
        expect.any(Object)
      );
    });
  });

  describe("createWardAction", () => {
    const adminId = "admin-estaca-1";

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminId,
            app_metadata: { role: "admin_estaca", stake_id: "stake-natal" },
          },
        },
        error: null,
      });

      (createWard as jest.Mock).mockResolvedValue({
        id: "ward-123",
        name: "Ala Candelária",
        stake_id: "stake-natal",
      });
    });

    it("retorna erro se não autenticado", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      });

      const formData = new FormData();
      formData.append("name", "Ala Nova");

      const result = await createWardAction({ success: false }, formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("retorna erro se role não é admin_estaca", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "member", stake_id: "stake-natal" },
          },
        },
        error: null,
      });

      const formData = new FormData();
      formData.append("name", "Ala Nova");

      const result = await createWardAction({ success: false }, formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Acesso negado");
    });

    it("chama createWard e retorna sucesso quando válido", async () => {
      const formData = new FormData();
      formData.append("name", "Ala Candelária");

      const result = await createWardAction({ success: false }, formData);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Ala "Ala Candelária" cadastrada com sucesso!');
      expect(createWard).toHaveBeenCalledWith(
        { name: "Ala Candelária" },
        adminId,
        expect.any(Object)
      );
    });
  });

  describe("updateWardAction", () => {
    const adminId = "admin-estaca-1";

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminId,
            app_metadata: { role: "admin_estaca", stake_id: "stake-natal" },
          },
        },
        error: null,
      });

      (updateWard as jest.Mock).mockResolvedValue({
        id: "ward-123",
        name: "Ala Candelária Atualizada",
        stake_id: "stake-natal",
      });
    });

    it("retorna erro se não autenticado", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      });

      const formData = new FormData();
      formData.append("wardId", "ward-123");
      formData.append("name", "Ala Atualizada");

      const result = await updateWardAction({ success: false }, formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("chama updateWard e retorna sucesso quando válido", async () => {
      const formData = new FormData();
      formData.append("wardId", "ward-123");
      formData.append("name", "Ala Candelária Atualizada");

      const result = await updateWardAction({ success: false }, formData);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Ala "Ala Candelária Atualizada" atualizada com sucesso!');
      expect(updateWard).toHaveBeenCalledWith(
        { wardId: "ward-123", name: "Ala Candelária Atualizada" },
        adminId,
        expect.any(Object)
      );
    });
  });

  describe("toggleWardStatusAction", () => {
    const adminId = "admin-estaca-1";

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminId,
            app_metadata: { role: "admin_estaca", stake_id: "stake-natal" },
          },
        },
        error: null,
      });

      (toggleWardStatus as jest.Mock).mockResolvedValue({
        id: "ward-123",
        name: "Ala Candelária",
        is_active: false,
      });
    });

    it("retorna erro se não autenticado", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      });

      const result = await toggleWardStatusAction("ward-123", false);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("chama toggleWardStatus e retorna sucesso quando válido", async () => {
      const result = await toggleWardStatusAction("ward-123", false);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Ala "Ala Candelária" foi inativada com sucesso.');
      expect(toggleWardStatus).toHaveBeenCalledWith(
        { wardId: "ward-123", isActive: false },
        adminId,
        expect.any(Object)
      );
    });
  });

  describe("deleteWardAction", () => {
    const adminId = "admin-estaca-1";

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: adminId,
            app_metadata: { role: "admin_estaca", stake_id: "stake-natal" },
          },
        },
        error: null,
      });

      (deleteWard as jest.Mock).mockResolvedValue(undefined);
    });

    it("retorna erro se não autenticado", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      });

      const result = await deleteWardAction("ward-123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Não autenticado");
    });

    it("chama deleteWard e retorna sucesso quando válido", async () => {
      const result = await deleteWardAction("ward-123");
      expect(result.success).toBe(true);
      expect(result.message).toContain("Ala excluída com sucesso.");
      expect(deleteWard).toHaveBeenCalledWith(
        "ward-123",
        adminId,
        expect.any(Object)
      );
    });
  });
});

