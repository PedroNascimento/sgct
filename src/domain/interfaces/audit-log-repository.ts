/**
 * Interface do repositório de Auditoria (audit_logs).
 * Artigo I: desacopla use-cases de infraestrutura e Supabase.
 */

export interface CreateAuditLogData {
  stake_id?: string | null;
  actor_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRepository {
  log(data: CreateAuditLogData): Promise<void>;
}
