/**
 * Utilitário de telemetria e observabilidade de jobs agendados (Spec 008/009 / M03).
 *
 * Registra início, duração, sucesso/falha e registros afetados na tabela cron_execution_logs.
 * Executado estritamente via service_role no backend confiável (Artigo V da Constituição).
 */

import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";

export interface CronJobResult {
  recordsAffected?: number;
  processedCount?: number;
  processed?: number;
  markedCount?: number;
  details?: Record<string, unknown> | unknown[];
  [key: string]: unknown;
}

export async function runCronWithLogging<T extends CronJobResult>(
  jobName: string,
  execute: () => Promise<T>
): Promise<T> {
  const supabase = createSupabaseServiceClient();
  const startTime = Date.now();
  let logId: string | null = null;

  try {
    const { data: logRecord } = await supabase
      .from("cron_execution_logs")
      .insert({
        job_name: jobName,
        status: "running",
        started_at: new Date(startTime).toISOString(),
      })
      .select("id")
      .single();

    if (logRecord?.id) {
      logId = logRecord.id;
    }
  } catch (logErr) {
    console.warn(`[cron-logger] Falha ao registrar início do job ${jobName}:`, logErr);
  }

  try {
    const result = await execute();
    const durationMs = Date.now() - startTime;
    const recordsAffected =
      result.recordsAffected ??
      result.processedCount ??
      result.processed ??
      result.markedCount ??
      0;

    if (logId) {
      await supabase
        .from("cron_execution_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          records_affected: recordsAffected,
          details: (result.details as Record<string, unknown>) ?? {},
        })
        .eq("id", logId);
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (logId) {
      await supabase
        .from("cron_execution_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          error_message: errorMessage,
        })
        .eq("id", logId);
    }

    throw error;
  }
}
