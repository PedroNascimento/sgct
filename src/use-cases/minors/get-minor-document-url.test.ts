/**
 * Testes para getMinorDocumentUrl (Spec 006 - T006.8).
 * Valida que a visualização de documento de menor por admin grava auditoria com action 'VIEW_MINOR_DOCUMENT'.
 * Artigo VI da Constituição: Conformidade LGPD automatizada.
 */

import { getMinorDocumentUrl } from "./get-minor-document-url";
import type { MinorRepository, StoragePort, AuditLogPort } from "@/domain/interfaces/minor-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { MinorApprovalForm } from "@/domain/types/minor";
import type { Profile } from "@/domain/types/tenant";

describe("getMinorDocumentUrl (T006.8)", () => {
  let mockMinorRepo: jest.Mocked<MinorRepository>;
  let mockStoragePort: jest.Mocked<StoragePort>;
  let mockProfileRepo: jest.Mocked<ProfileRepository>;
  let mockAuditLogPort: jest.Mocked<AuditLogPort>;

  const STAKE_ID = "11111111-1111-1111-1111-111111111111";
  const WARD_ID = "22222222-2222-2222-2222-222222222222";
  const ADMIN_ID = "33333333-3333-3333-3333-333333333333";
  const FORM_ID = "44444444-4444-4444-4444-444444444444";

  const adminProfile: Profile = {
    id: ADMIN_ID,
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    role: "admin_ala",
    full_name: "Admin Ala Tirol",
    email: "admin@tirol.org",
    phone: "84999990000",
    cpf_hash: "hash",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const form: MinorApprovalForm = {
    id: FORM_ID,
    stake_id: STAKE_ID,
    ward_id: WARD_ID,
    reservation_id: "55555555-5555-5555-5555-555555555555",
    storage_path: `${STAKE_ID}/${WARD_ID}/res/doc.pdf`,
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

    mockStoragePort = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    mockProfileRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      findInactiveUsers: jest.fn(),
      deactivateUser: jest.fn(),
    };

    mockAuditLogPort = {
      recordLog: jest.fn(),
    };
  });

  it("deve gerar signed URL e registrar auditoria VIEW_MINOR_DOCUMENT quando lido por admin", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce(adminProfile);
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);
    mockStoragePort.getSignedUrl.mockResolvedValueOnce("https://storage.supabase.co/signed/doc.pdf");

    const result = await getMinorDocumentUrl(
      {
        formId: FORM_ID,
        adminId: ADMIN_ID,
      },
      {
        minorRepository: mockMinorRepo,
        storagePort: mockStoragePort,
        profileRepository: mockProfileRepo,
        auditLogPort: mockAuditLogPort,
      }
    );

    expect(result.signedUrl).toBe("https://storage.supabase.co/signed/doc.pdf");

    // Verifica gravação no log de auditoria (LGPD Artigo VI)
    expect(mockAuditLogPort.recordLog).toHaveBeenCalledWith({
      stakeId: STAKE_ID,
      userId: ADMIN_ID,
      action: "VIEW_MINOR_DOCUMENT",
      resourceType: "minor_approval_forms",
      resourceId: FORM_ID,
      details: {
        reservationId: form.reservation_id,
        storagePath: form.storage_path,
      },
    });
  });

  it("deve bloquear acesso se o admin pertencer a outra Ala", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      ward_id: "99999999-9999-9999-9999-999999999999",
    });
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);

    await expect(
      getMinorDocumentUrl(
        { formId: FORM_ID, adminId: ADMIN_ID },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          profileRepository: mockProfileRepo,
          auditLogPort: mockAuditLogPort,
        }
      )
    ).rejects.toThrow("Não autorizado: formulário pertence a outra Ala");

    expect(mockAuditLogPort.recordLog).not.toHaveBeenCalled();
  });

  it("deve rejeitar se o administrador estiver inativo ou não for encontrado", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce(null);

    await expect(
      getMinorDocumentUrl(
        { formId: FORM_ID, adminId: ADMIN_ID },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          profileRepository: mockProfileRepo,
          auditLogPort: mockAuditLogPort,
        }
      )
    ).rejects.toThrow("Administrador não encontrado ou inativo.");
  });

  it("deve rejeitar se o usuário não for admin de Ala nem de Estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      role: "member",
    });

    await expect(
      getMinorDocumentUrl(
        { formId: FORM_ID, adminId: ADMIN_ID },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          profileRepository: mockProfileRepo,
          auditLogPort: mockAuditLogPort,
        }
      )
    ).rejects.toThrow("Apenas administradores podem acessar documentos de menores.");
  });

  it("deve rejeitar se o formulário não for encontrado", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce(adminProfile);
    mockMinorRepo.findFormById.mockResolvedValueOnce(null);

    await expect(
      getMinorDocumentUrl(
        { formId: FORM_ID, adminId: ADMIN_ID },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          profileRepository: mockProfileRepo,
          auditLogPort: mockAuditLogPort,
        }
      )
    ).rejects.toThrow("Formulário não encontrado");
  });

  it("deve rejeitar se o admin for de outra Estaca", async () => {
    mockProfileRepo.findById.mockResolvedValueOnce({
      ...adminProfile,
      stake_id: "other-stake",
    });
    mockMinorRepo.findFormById.mockResolvedValueOnce(form);

    await expect(
      getMinorDocumentUrl(
        { formId: FORM_ID, adminId: ADMIN_ID },
        {
          minorRepository: mockMinorRepo,
          storagePort: mockStoragePort,
          profileRepository: mockProfileRepo,
          auditLogPort: mockAuditLogPort,
        }
      )
    ).rejects.toThrow("Não autorizado: formulário pertence a outra Estaca.");
  });
});
