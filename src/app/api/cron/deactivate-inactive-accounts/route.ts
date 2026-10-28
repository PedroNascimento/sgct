import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { deactivateInactiveAccounts } from "@/use-cases/auth/deactivate-inactive-accounts";
import { runCronWithLogging } from "@/infrastructure/logging/cron-logger";

/**
 * Job interno da spec 001: inativa perfis sem login há 24 meses (M03).
 * A chave privilegiada só é criada depois da autenticação do job.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runCronWithLogging("deactivate-inactive-accounts", async () => {
      const repository = new SupabaseProfileRepository(createSupabaseServiceClient());
      const out = await deactivateInactiveAccounts(repository);
      return {
        ...out,
        recordsAffected: out.deactivatedCount,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao inativar contas.",
      },
      { status: 500 }
    );
  }
}
