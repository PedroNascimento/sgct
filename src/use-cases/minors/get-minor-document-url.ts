/**
 * Caso de uso: Obter URL assinada para leitura de documento de menor e registrar log de auditoria (T006.8 / Artigo VI).
 * LGPD: Toda leitura administrativa de dados de menores gera auditoria com action 'VIEW_MINOR_DOCUMENT'.
 */

import type { MinorRepository, StoragePort, AuditLogPort } from "@/domain/interfaces/minor-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface GetMinorDocumentUrlInput {
  formId: string;
  adminId: string;
}

export interface GetMinorDocumentUrlDependencies {
  minorRepository: MinorRepository;
  storagePort: StoragePort;
  profileRepository: ProfileRepository;
  auditLogPort: AuditLogPort;
}

export async function getMinorDocumentUrl(
  input: GetMinorDocumentUrlInput,
  deps: GetMinorDocumentUrlDependencies
): Promise<{ signedUrl: string }> {
  const { minorRepository, storagePort, profileRepository, auditLogPort } = deps;

  // 1. Busca e validação do admin
  const admin = await profileRepository.findById(input.adminId);
  if (!admin || !admin.is_active) {
    throw new Error("Administrador não encontrado ou inativo.");
  }

  if (admin.role !== "admin_ala" && admin.role !== "admin_estaca") {
    throw new Error("Apenas administradores podem acessar documentos de menores.");
  }

  // 2. Busca do formulário
  const form = await minorRepository.findFormById(input.formId);
  if (!form) {
    throw new Error(`Formulário não encontrado: ${input.formId}`);
  }

  // 3. Isolamento multi-tenant (Artigo II)
  if (admin.stake_id !== form.stake_id) {
    throw new Error("Não autorizado: formulário pertence a outra Estaca.");
  }

  if (admin.role === "admin_ala" && admin.ward_id !== form.ward_id) {
    throw new Error("Não autorizado: formulário pertence a outra Ala.");
  }

  // 4. Gera signed URL temporária (válida por 15 minutos / 900 segundos)
  const signedUrl = await storagePort.getSignedUrl("minor-forms", form.storage_path, 900);

  // 5. Registra auditoria obrigatória LGPD (Artigo VI da Constituição)
  await auditLogPort.recordLog({
    stakeId: form.stake_id,
    userId: admin.id,
    action: "VIEW_MINOR_DOCUMENT",
    resourceType: "minor_approval_forms",
    resourceId: form.id,
    details: {
      reservationId: form.reservation_id,
      storagePath: form.storage_path,
    },
  });

  return { signedUrl };
}
