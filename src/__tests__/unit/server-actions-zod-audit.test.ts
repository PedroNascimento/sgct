import { approveMinorForm } from "@/use-cases/minors/approve-minor-form";
import type { MinorRepository, AuditLogPort } from "@/domain/interfaces/minor-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { UserProfile } from "@/domain/types/profile";
import type { MinorApprovalForm } from "@/domain/types/minor";

describe("T010.3 & T010.5 — Auditoria de Segurança: Validação Zod e Audit Logs", () => {
  it("deve rejeitar aprovação de menor com status inválido (validação Zod)", async () => {
    const mockMinorRepo: Partial<MinorRepository> = {
      findFormById: jest.fn(),
      updateFormStatus: jest.fn(),
    };
    const mockProfileRepo: Partial<ProfileRepository> = {
      findById: jest.fn(),
    };

    await expect(
      approveMinorForm(
        {
          formId: "not-a-uuid",
          adminId: "not-a-uuid",
          // @ts-expect-error teste com valor inválido
          status: "invalido",
        },
        {
          minorRepository: mockMinorRepo as MinorRepository,
          profileRepository: mockProfileRepo as ProfileRepository,
        }
      )
    ).rejects.toThrow();
  });

  it("deve registrar evento em auditLogPort ao aprovar formulário de menor (T010.5)", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const formId = "22222222-2222-4222-8222-222222222222";
    const stakeId = "33333333-3333-4333-8333-333333333333";
    const wardId = "44444444-4444-4444-8444-444444444444";

    const mockAdmin: UserProfile = {
      id: adminId,
      stake_id: stakeId,
      ward_id: wardId,
      full_name: "Admin da Ala",
      birth_date: "1980-01-01",
      role: "admin_ala",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockForm: MinorApprovalForm = {
      id: formId,
      stake_id: stakeId,
      ward_id: wardId,
      reservation_id: "55555555-5555-4555-8555-555555555555",
      storage_path: "path/to/doc.pdf",
      file_name: "termo.pdf",
      file_size_bytes: 1024,
      file_type: "application/pdf",
      status: "pending",
      uploaded_by: "66666666-6666-4666-8666-666666666666",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockMinorRepo: Partial<MinorRepository> = {
      findFormById: jest.fn().mockResolvedValue(mockForm),
      updateFormStatus: jest.fn().mockResolvedValue({
        ...mockForm,
        status: "approved",
        evaluated_by: adminId,
      }),
    };

    const mockProfileRepo: Partial<ProfileRepository> = {
      findById: jest.fn().mockResolvedValue(mockAdmin),
    };

    const mockAuditLogPort: AuditLogPort = {
      recordLog: jest.fn().mockResolvedValue(undefined),
    };

    const result = await approveMinorForm(
      {
        formId,
        adminId,
        status: "approved",
      },
      {
        minorRepository: mockMinorRepo as MinorRepository,
        profileRepository: mockProfileRepo as ProfileRepository,
        auditLogPort: mockAuditLogPort,
      }
    );

    expect(result.status).toBe("approved");
    expect(mockAuditLogPort.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        stakeId,
        userId: adminId,
        action: "APPROVE_MINOR_DOCUMENT",
        resourceType: "minor_approval_forms",
        resourceId: formId,
      })
    );
  });
});
