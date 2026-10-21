/**
 * Caso de uso: Aprovar/Rejeitar Formulário de Menor (Spec 006 - T006.7).
 * Artigo I: Domínio puro / Use-case.
 * Artigo II: Isolamento multi-tenant (Admin Ala só aprova de sua Ala; Admin Estaca de sua Estaca).
 * Artigo III: Transição de status sensível exclusivamente via use-case.
 */

import { approveMinorFormSchema } from "@/domain/schemas/minor";
import type { MinorRepository, AuditLogPort } from "@/domain/interfaces/minor-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { MinorApprovalForm, MinorFormStatus } from "@/domain/types/minor";

export interface ApproveMinorFormInput {
  formId: string;
  adminId: string;
  status: "approved" | "rejected";
}

export interface ApproveMinorFormDependencies {
  minorRepository: MinorRepository;
  profileRepository: ProfileRepository;
  auditLogPort?: AuditLogPort;
}

export async function approveMinorForm(
  input: ApproveMinorFormInput,
  deps: ApproveMinorFormDependencies
): Promise<MinorApprovalForm> {
  const { minorRepository, profileRepository, auditLogPort } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = approveMinorFormSchema.parse(input);

  // 2. Validação do Administrador
  const admin = await profileRepository.findById(validated.adminId);
  if (!admin || !admin.is_active) {
    throw new Error("Administrador não encontrado ou inativo.");
  }

  if (admin.role !== "admin_ala" && admin.role !== "admin_estaca") {
    throw new Error("Apenas administradores de Ala ou Estaca podem avaliar formulários de menores.");
  }

  // 3. Busca do formulário
  const form = await minorRepository.findFormById(validated.formId);
  if (!form) {
    throw new Error(`Formulário não encontrado: ${validated.formId}`);
  }

  // 4. Isolamento multi-tenant (Artigo II)
  if (admin.stake_id !== form.stake_id) {
    throw new Error("Não autorizado: formulário pertence a outra Estaca.");
  }

  if (admin.role === "admin_ala" && admin.ward_id !== form.ward_id) {
    throw new Error("Não autorizado: formulário pertence a outra Ala.");
  }

  // 5. Atualização de status
  const updatedForm = await minorRepository.updateFormStatus(
    form.id,
    validated.status as MinorFormStatus,
    admin.id
  );

  // 6. Auditoria LGPD / Ação administrativa sensível (T010.5 / Artigo VI)
  if (auditLogPort) {
    await auditLogPort.recordLog({
      stakeId: form.stake_id,
      userId: admin.id,
      action: validated.status === "approved" ? "APPROVE_MINOR_DOCUMENT" : "REJECT_MINOR_DOCUMENT",
      resourceType: "minor_approval_forms",
      resourceId: form.id,
      details: {
        reservationId: form.reservation_id,
        status: validated.status,
      },
    });
  }

  return updatedForm;
}

