import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseCreditRepository } from "@/infrastructure/supabase/supabase-credit-repository";
import { expireCredits } from "@/use-cases/credit/expire-credits";
import { runCronWithLogging } from "@/infrastructure/logging/cron-logger";

/**
 * Endpoint de cron: Expiração Diária de Créditos não utilizados após 12 meses (T005.8 / US-005.3 / M03)
 *
 * Agendado para rodar diariamente às 04:00 UTC via pg_cron.
 * Autenticado estritamente via CRON_SECRET (Artigo V da Constituição).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runCronWithLogging("expire-credits", async () => {
      const supabase = createSupabaseServiceClient();
      const creditRepo = new SupabaseCreditRepository(supabase);

      const out = await expireCredits({}, { creditRepository: creditRepo });

      return {
        ...out,
        recordsAffected: out.expiredCount,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido ao expirar créditos.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
