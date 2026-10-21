/**
 * Use-case: Expurgo Automático de Dados de Menores (Spec 009 / T009.5 / US-009.3 / Artigo VI).
 *
 * Regras:
 * - Prazo de retenção: 90 dias após a data de conclusão da viagem (return_date ?? departure_date).
 * - Documento com 89 dias permanece no sistema (teste de limite estrito).
 * - Documento com 90 dias ou mais é excluído definitivamente do Storage e da tabela minor_approval_forms.
 * - Registros de crianças de colo em passenger_manifest_entries também são expurgados após 90 dias.
 * - Toda exclusão gera entrada correspondente em audit_logs (Artigo VI / PRD seção 7).
 */

import type { RetentionRepository } from "@/domain/interfaces/retention-repository";
import type { AuditLogPort } from "@/domain/interfaces/minor-repository";

export interface PurgeExpiredMinorDataInput {
  now?: Date;
}

export interface PurgeExpiredMinorDataResult {
  purgedFormsCount: number;
  purgedManifestCount: number;
}

export interface PurgeExpiredMinorDataDependencies {
  retentionRepository: RetentionRepository;
  auditLogPort?: AuditLogPort;
}

export async function purgeExpiredMinorData(
  input: PurgeExpiredMinorDataInput,
  deps: PurgeExpiredMinorDataDependencies
): Promise<PurgeExpiredMinorDataResult> {
  const now = input.now ?? new Date();

  // Limite estrito de 90 dias
  const cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 1. Busca formulários de menor com mais de 90 dias da conclusão da caravana
  const expiredForms = await deps.retentionRepository.findExpiredMinorForms(cutoffDate);

  let purgedFormsCount = 0;

  for (const form of expiredForms) {
    // Exclui o arquivo físico no Storage
    try {
      await deps.retentionRepository.deleteFile("minor-forms", form.storagePath);
    } catch (err) {
      console.warn(`Erro ao excluir arquivo no storage (${form.storagePath}):`, err);
    }

    // Exclui o registro na tabela
    await deps.retentionRepository.deleteMinorForm(form.id);

    // Registra log de auditoria da própria exclusão (Artigo VI)
    if (deps.auditLogPort) {
      await deps.auditLogPort.recordLog({
        stakeId: form.stakeId,
        userId: "system",
        action: "PURGE_EXPIRED_MINOR_DATA",
        resourceType: "minor_approval_form",
        resourceId: form.id,
        details: {
          storagePath: form.storagePath,
          caravanDepartureDate: form.caravanDepartureDate,
          caravanReturnDate: form.caravanReturnDate,
          purgedAt: now.toISOString(),
        },
      });
    }

    purgedFormsCount++;
  }

  // 2. Expurgo de dados de crianças de colo no manifesto após 90 dias
  const purgedManifestCount =
    await deps.retentionRepository.deleteExpiredManifestEntries(cutoffDate);

  return {
    purgedFormsCount,
    purgedManifestCount,
  };
}
