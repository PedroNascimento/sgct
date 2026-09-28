import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { deactivateInactiveAccounts } from "@/use-cases/auth/deactivate-inactive-accounts";

/**
 * Job interno da spec 001: inativa perfis sem login há 24 meses.
 * A chave privilegiada só é criada depois da autenticação do job.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const repository = new SupabaseProfileRepository(createSupabaseServiceClient());
    const result = await deactivateInactiveAccounts(repository);
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
