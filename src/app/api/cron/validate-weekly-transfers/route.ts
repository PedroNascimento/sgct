import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";

/**
 * Endpoint de cron: Validação Semanal das Transferências (T004.6 / US-004.2)
 *
 * Agendado para toda terça-feira às 06:00.
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
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const caravanRepo = new SupabaseCaravanRepository(supabase);

    // Busca todas as caravanas ativas com inscrições abertas
    const { data: openCaravans, error } = await supabase
      .from("caravans")
      .select("id")
      .eq("status", "open");

    if (error) {
      throw new Error(`Erro ao buscar caravanas abertas: ${error.message}`);
    }

    const results = [];
    for (const caravan of openCaravans ?? []) {
      const res = await validateWeeklyTransfers(
        { caravanId: caravan.id, isAutomatedJob: true },
        { reservationRepository: reservationRepo, caravanRepository: caravanRepo }
      );
      results.push({ caravanId: caravan.id, ...res });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      details: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao processar validação semanal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
