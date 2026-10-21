import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCreditRepository } from "@/infrastructure/supabase/supabase-credit-repository";
import { CheckMinimumQuorumUseCase } from "@/use-cases/quorum/check-minimum-quorum";
import { RolloverReservationUseCase } from "@/use-cases/quorum/rollover-reservation";

/**
 * Endpoint de cron: Verificação de Quórum Mínimo Semanal (T006.2 / US-006.1)
 *
 * Agendado para toda terça-feira às 05:00 UTC (terça anterior ao embarque / quorum_check_date).
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
    const caravanRepo = new SupabaseCaravanRepository(supabase);
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const creditRepo = new SupabaseCreditRepository(supabase);
    const checkMinimumQuorum = new CheckMinimumQuorumUseCase(caravanRepo, reservationRepo);
    const rolloverUseCase = new RolloverReservationUseCase(caravanRepo, reservationRepo, creditRepo);

    // Busca caravanas abertas ou com quórum pendente cuja data de check de quórum seja menor ou igual a hoje
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: caravansToCheck, error } = await supabase
      .from("caravans")
      .select("id, quorum_check_date, status")
      .in("status", ["open", "quorum_pending"])
      .lte("quorum_check_date", todayStr);

    if (error) {
      throw new Error(`Erro ao buscar caravanas para checagem de quórum: ${error.message}`);
    }

    const results = [];
    for (const caravan of caravansToCheck ?? []) {
      const res = await checkMinimumQuorum.execute({ caravanId: caravan.id });

      const rolloverDetails = [];
      if (res.cancelled) {
        const activeReservations = await reservationRepo.findByCaravanAndStatuses(caravan.id, [
          "confirmado",
          "pago_ala",
          "pendente",
        ]);

        for (const reservation of activeReservations) {
          try {
            const rolloverRes = await rolloverUseCase.execute({
              cancelledCaravanId: caravan.id,
              reservation,
            });
            rolloverDetails.push({
              reservationId: reservation.id,
              creditId: rolloverRes.creditEntry.id,
              transferredToCaravanId: rolloverRes.newReservation?.caravan_id ?? null,
            });
          } catch (rErr) {
            console.error(`Erro no rollover da reserva ${reservation.id}:`, rErr);
          }
        }
      }

      results.push({
        ...res,
        rollovers: rolloverDetails,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      details: results,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido ao processar quórum mínimo.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
