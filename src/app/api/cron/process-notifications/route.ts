import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseNotificationQueueRepository } from "@/infrastructure/supabase/supabase-notification-queue-repository";
import { ResendEmailGateway } from "@/infrastructure/email/resend-email-gateway";
import { processNotificationQueue } from "@/use-cases/notifications/process-notification-queue";
import { runCronWithLogging } from "@/infrastructure/logging/cron-logger";

/**
 * Endpoint de cron: Processamento assíncrono da fila de notificações por e-mail (Spec 008 / T008.5 / M03).
 *
 * Agendado para rodar a cada 5 minutos via pg_cron ou webhook de infraestrutura.
 * Autenticado estritamente via CRON_SECRET (Artigo V da Constituição).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runCronWithLogging("process-notifications", async () => {
      const supabase = createSupabaseServiceClient();
      const repository = new SupabaseNotificationQueueRepository(supabase);
      const emailGateway = new ResendEmailGateway();

      const out = await processNotificationQueue(
        { batchSize: 25 },
        { repository, emailGateway }
      );

      return {
        ...out,
        recordsAffected: out.sent,
        processedCount: out.processed,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro desconhecido ao processar fila de notificações.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
