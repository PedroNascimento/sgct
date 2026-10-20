import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseCreditRepository } from "@/infrastructure/supabase/supabase-credit-repository";
import { expireCredits } from "@/use-cases/credit/expire-credits";

/**
 * Endpoint de cron: Expiração Diária de Créditos não utilizados após 12 meses (T005.8 / US-005.3)
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
    const supabase = createSupabaseServiceClient();
    const creditRepo = new SupabaseCreditRepository(supabase);

    const result = await expireCredits({}, { creditRepository: creditRepo });

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
