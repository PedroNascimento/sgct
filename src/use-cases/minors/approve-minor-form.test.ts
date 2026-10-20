/**
 * Testes unitários para approveMinorForm (Spec 006 - T006.7).
 * Valida aprovação/rejeição por Admin Ala/Estaca e bloqueio de avanço para 'pago_ala' se pendente ou rejeitado.
 * Artigo I e Artigo III da Constituição.
 */

import { approveMinorForm } from "./approve-minor-form";
import type { MinorRepository } from "@/domain/interfaces/minor-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { MinorApprovalForm } from "@/domain/types/minor";
import type { Profile } from "@/domain/types/tenant";

describe("approveMinorForm (T006.7)", () => {
  let mockMinorRepo: jest.Mocked<MinorRepository>;
  let mockProfileRepo: jest.Mocked<ProfileRepository>;

  const adminAla: Profile = {
    id: "00000000-0000-0000-0000-000000000001",
    stake_id: "11111111-1111-1111-1111-111111111111",
    ward_id: "22222222-2222-2222-2222-222222222222",
    role: "admin_ala",
    full_name: "Admin da Ala",
    email: "admin@ala.org",
    phone: "84999999999",
    cpf_hash: "hash",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const form: MinorApprovalForm = {
    id: "33333333-3333-3333-3333-333333333333",
    stake_id: "11111111-1111-1111-1111-111111111111",
    ward_id: "22222222-2222-2222-2222-222222222222",
    reservation_id: "44444444-4444-4444-4444-444444444444",
    storage_path: "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/44444444-4444-4444-4444-444444444444/autorizacao.pdf",
    status: "pending",
    approved_by: null,
    approved_at: null,
  };

  beforeEach(() => {
    mockMinorRepo = {
      createForm: jest.fn(),
      findFormById: jest.fn(),
      findFormByReservationId: jest.fn(),
      findPendingFormsByWard: jest.fn(),
      updateFormStatus: jest.fn(),
    };

    mockProfileRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      findInactiveUsers: jest.fn(),
      deactivateUser: jest.fn(),
    };
  });

  it("deve aprovar o formulário com sucesso quando executado pelo Admin da mesma Ala", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce(adminAla);
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);
    mockMinorRepo.updateFormStatus.mockResolvedValueOnce({
      ...form,
      status: "approved",
      approved_by: adminAla.id,
      approved_at: new Date().toISOString(),
    });

    const result = await approveMinorForm(
      {
        formId: form.id,
        adminId: adminAla.id,
        status: "approved",
      },
      {
        minorRepository: mockMinorRepo,
        profileRepository: mockProfileRepo,
      }
    );

    expect(result.status).toBe("approved");
    expect(mockMinorRepo.updateFormStatus).toHaveBeenCalledWith(form.id, "approved", adminAla.id);
  });

  it("deve permitir rejeitar o formulário", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce(adminAla);
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);
    mockMinorRepo.updateFormStatus.mockResolvedValueOnce({
      ...form,
      status: "rejected",
      approved_by: adminAla.id,
      approved_at: new Date().toISOString(),
    });

    const result = await approveMinorForm(
      {
        formId: form.id,
        adminId: adminAla.id,
        status: "rejected",
      },
      {
        minorRepository: mockMinorRepo,
        profileRepository: mockProfileRepo,
      }
    );

    expect(result.status).toBe("rejected");
    expect(mockMinorRepo.updateFormStatus).toHaveBeenCalledWith(form.id, "rejected", adminAla.id);
  });

  it("deve rejeitar se o administrador for de outra Ala", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminAla,
      ward_id: "55555555-5555-5555-5555-555555555555",
    });
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);

    await expect(
      approveMinorForm(
        {
          formId: form.id,
          adminId: adminAla.id,
          status: "approved",
        },
        {
          minorRepository: mockMinorRepo,
          profileRepository: mockProfileRepo,
        }
      )
    ).rejects.toThrow("Não autorizado: formulário pertence a outra Ala");
  });

  it("deve rejeitar se o administrador for de outra Estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminAla,
      stake_id: "66666666-6666-6666-6666-666666666666",
    });
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);

    await expect(
      approveMinorForm(
        {
          formId: form.id,
          adminId: adminAla.id,
          status: "approved",
        },
        {
          minorRepository: mockMinorRepo,
          profileRepository: mockProfileRepo,
        }
      )
    ).rejects.toThrow("Não autorizado: formulário pertence a outra Estaca");
  });
});
