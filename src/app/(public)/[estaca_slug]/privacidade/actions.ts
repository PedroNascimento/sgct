"use server";

import { z } from "zod";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseAuditLogRepository } from "@/infrastructure/supabase/supabase-audit-log-repository";

const LgpdRequestSchema = z.object({
  stakeId: z.string().uuid("ID da Estaca inválido"),
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string().optional(),
  requestType: z.enum([
    "access",
    "correction",
    "deletion",
    "revocation",
    "information",
  ]),
  message: z.string().min(10, "Mensagem deve conter pelo menos 10 caracteres"),
});

export type LgpdRequestInput = z.infer<typeof LgpdRequestSchema>;

export async function submitLgpdRequest(input: LgpdRequestInput) {
  try {
    const validated = LgpdRequestSchema.parse(input);

    const serviceClient = createSupabaseServiceClient();
    const auditRepo = new SupabaseAuditLogRepository(serviceClient);

    const protocol = `LGPD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Registra a solicitação formal no log de auditoria da Estaca
    await auditRepo.recordLog({
      stakeId: validated.stakeId,
      userId: "anonymous_data_subject",
      action: "LGPD_DATA_SUBJECT_REQUEST",
      resourceType: "data_subject_request",
      resourceId: protocol,
      details: {
        protocol,
        fullName: validated.fullName,
        email: validated.email,
        cpf: validated.cpf || null,
        requestType: validated.requestType,
        message: validated.message,
        submittedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      protocol,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar solicitação.",
    };
  }
}
