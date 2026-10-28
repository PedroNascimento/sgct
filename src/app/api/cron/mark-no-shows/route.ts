import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCheckInRepository } from "@/infrastructure/supabase/supabase-checkin-repository";
import { MarkNoShows } from "@/use-cases/checkin/mark-no-shows";
import { runCronWithLogging } from "@/infrastructure/logging/cron-logger";

/**
 * Endpoint de cron / automação: Marcação de No-Shows pós-embarque (T007.7 / US-007.3 / M03).
 *
 * Suporta execução pontual com caravan_id ou varredura de todas as caravanas cujo embarque ocorreu.
 * Autenticado estritamente via CRON_SECRET (Artigo V da Constituição).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const targetCaravanId = body.caravan_id;

    const result = await runCronWithLogging("mark-no-shows", async () => {
      const supabase = createSupabaseServiceClient();
      const reservationRepo = new SupabaseReservationRepository(supabase);
      const checkInRepo = new SupabaseCheckInRepository(supabase);
      const markNoShows = new MarkNoShows(reservationRepo, checkInRepo);

      let caravanIdsToProcess: string[] = [];

      if (targetCaravanId) {
        caravanIdsToProcess = [targetCaravanId];
      } else {
        // Varredura autônoma: caravanas cujo embarque ocorreu e que ainda possuem confirmações
        const nowIso = new Date().toISOString();
        const { data: departedCaravans, error } = await supabase
          .from("caravans")
          .select("id")
          .lte("departure_date", nowIso.split("T")[0])
          .in("status", ["confirmada", "em_andamento", "em_transito", "encerrada"]);

        if (error) {
          throw new Error(`Erro ao buscar caravanas para no-show: ${error.message}`);
        }

        caravanIdsToProcess = (departedCaravans || []).map((c) => c.id);
      }

      let totalMarked = 0;
      const details: Array<{ caravanId: string; markedCount: number }> = [];

      for (const caravanId of caravanIdsToProcess) {
        const out = await markNoShows.execute({ caravanId });
        totalMarked += out.markedCount;
        details.push({ caravanId, markedCount: out.markedCount });
      }

      return {
        success: true,
        markedCount: totalMarked,
        recordsAffected: totalMarked,
        processedCount: caravanIdsToProcess.length,
        details,
      };
    });

    return NextResponse.json({
      ...result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro desconhecido ao processar no-shows.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
