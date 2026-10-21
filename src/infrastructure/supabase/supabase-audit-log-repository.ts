import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditLogRepository,
  CreateAuditLogData,
} from "@/domain/interfaces/audit-log-repository";
import type { AuditLogPort } from "@/domain/interfaces/minor-repository";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";

export class SupabaseAuditLogRepository implements AuditLogRepository, AuditLogPort {
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

  async recordLog(entry: {
    stakeId?: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const isUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const validActorId = isUuid(entry.userId) ? entry.userId : null;
    const validEntityId = isUuid(entry.resourceId) ? entry.resourceId : null;

    await this.log({
      stake_id: entry.stakeId ?? null,
      actor_id: validActorId,
      action: entry.action,
      entity: entry.resourceType,
      entity_id: validEntityId,
      metadata: {
        ...entry.details,
        ...(validActorId ? {} : { rawUserId: entry.userId }),
        ...(validEntityId ? {} : { rawResourceId: entry.resourceId }),
      },
    });
  }
}

