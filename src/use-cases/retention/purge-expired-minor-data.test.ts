import { purgeExpiredMinorData } from "./purge-expired-minor-data";
import type {
  RetentionRepository,
  ExpiredMinorFormItem,
} from "@/domain/interfaces/retention-repository";
import type { AuditLogPort } from "@/domain/interfaces/minor-repository";

describe("purgeExpiredMinorData (T009.5 / US-009.3 / Artigo VI)", () => {
  let mockRetentionRepo: jest.Mocked<RetentionRepository>;
  let mockAuditLogPort: jest.Mocked<AuditLogPort>;

  const baseDate = new Date("2026-10-21T10:00:00Z");

  beforeEach(() => {
    mockRetentionRepo = {
      findExpiredMinorForms: jest.fn().mockResolvedValue([]),
      deleteMinorForm: jest.fn().mockResolvedValue(undefined),
      deleteExpiredManifestEntries: jest.fn().mockResolvedValue(0),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditLogPort = {
      recordLog: jest.fn().mockResolvedValue(undefined),
    };
  });

  it("expurga documento quando completar 90 dias da data de retorno da caravana", async () => {
    // 90 dias antes de baseDate: 2026-07-23
    const expiredItem: ExpiredMinorFormItem = {
      id: "form-expired-90",
      stakeId: "c3d18063-f0fa-4f9e-be4c-fc3b74e622b3",
      storagePath: "c3d18063/ward-1/res-1/termo.pdf",
      caravanDepartureDate: "2026-07-20",
      caravanReturnDate: "2026-07-23",
    };

    mockRetentionRepo.findExpiredMinorForms.mockResolvedValueOnce([expiredItem]);
    mockRetentionRepo.deleteExpiredManifestEntries.mockResolvedValueOnce(2);

    const result = await purgeExpiredMinorData(
      { now: baseDate },
      { retentionRepository: mockRetentionRepo, auditLogPort: mockAuditLogPort }
    );

    expect(result.purgedFormsCount).toBe(1);
    expect(result.purgedManifestCount).toBe(2);
    expect(mockRetentionRepo.deleteFile).toHaveBeenCalledWith(
      "minor-forms",
      "c3d18063/ward-1/res-1/termo.pdf"
    );
    expect(mockRetentionRepo.deleteMinorForm).toHaveBeenCalledWith("form-expired-90");
    expect(mockAuditLogPort.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PURGE_EXPIRED_MINOR_DATA",
        resourceType: "minor_approval_form",
        resourceId: "form-expired-90",
      })
    );
  });

  it("NÃO expurga documento com 89 dias da data de retorno (teste de limite estrito)", async () => {
    // Cutoff exato deve ser now - 90 dias.
    // O repositório recebe cutoffDate calculado.
    await purgeExpiredMinorData(
      { now: baseDate },
      { retentionRepository: mockRetentionRepo }
    );

    expect(mockRetentionRepo.findExpiredMinorForms).toHaveBeenCalledTimes(1);
    const calledCutoff: Date = mockRetentionRepo.findExpiredMinorForms.mock.calls[0][0];

    const diffDays = Math.round((baseDate.getTime() - calledCutoff.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);

    // Se o documento tem 89 dias, a caravana retornou após o cutoff, então findExpiredMinorForms não retorna ele
    expect(mockRetentionRepo.deleteMinorForm).not.toHaveBeenCalled();
    expect(mockRetentionRepo.deleteFile).not.toHaveBeenCalled();
  });
});
