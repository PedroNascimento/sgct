import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditLogRepository,
  CreateAuditLogData,
} from "@/domain/interfaces/audit-log-repository";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";

export class SupabaseAuditLogRepository implements AuditLogRepository {
  constructor(private readonly supabase?: SupabaseClient) {}

  async log(data: CreateAuditLogData): Promise<void> {
    // Audit logs de inserção possuem policy restrita a service_role (audit_insert_service)
    // Usamos o client de serviço para garantir gravação imutável e auditável
    const client = this.supabase || createSupabaseServiceClient();

    const { error } = await client.from("audit_logs").insert({
      stake_id: data.stake_id ?? null,
      actor_id: data.actor_id,
      action: data.action,
      entity: data.entity,
      entity_id: data.entity_id ?? null,
      metadata: data.metadata ?? null,
    });

    if (error) {
      console.error("Erro ao registrar log de auditoria:", error);
      throw new Error(`Falha ao registrar auditoria: ${error.message}`);
    }
  }
}
