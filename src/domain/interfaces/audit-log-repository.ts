/**
 * Interface do repositório de Auditoria (audit_logs).
 * Artigo I: desacopla use-cases de infraestrutura e Supabase.
 */

export interface CreateAuditLogData {
  stake_id?: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRepository {
  log(data: CreateAuditLogData): Promise<void>;
}
