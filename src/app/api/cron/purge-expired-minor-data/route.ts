import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseRetentionRepository } from "@/infrastructure/supabase/supabase-retention-repository";
import { SupabaseAuditLogRepository } from "@/infrastructure/supabase/supabase-audit-log-repository";
import { purgeExpiredMinorData } from "@/use-cases/retention/purge-expired-minor-data";

/**
 * Endpoint de cron: Expurgo semanal de documentos e dados de menores vencidos (>90 dias) (Spec 009 / T009.6 / Artigo VI).
 *
 * Agendado para rodar semanalmente via pg_cron.
 * Autenticado estritamente via CRON_SECRET (Artigo V da Constituição).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const retentionRepository = new SupabaseRetentionRepository(supabase);
    const auditLogPort = new SupabaseAuditLogRepository(supabase);

    const result = await purgeExpiredMinorData(
      {},
      { retentionRepository, auditLogPort }
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro desconhecido ao expurgar dados de menores.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
