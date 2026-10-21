import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCheckInRepository } from "@/infrastructure/supabase/supabase-checkin-repository";
import { MarkNoShows } from "@/use-cases/checkin/mark-no-shows";

/**
 * Endpoint de cron / automação: Marcação de No-Shows pós-embarque (T007.7 / US-007.3)
 *
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
    const caravanId = body.caravan_id;

    if (!caravanId) {
      return NextResponse.json(
        { error: "caravan_id é obrigatório para execução do job pós-embarque." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const checkInRepo = new SupabaseCheckInRepository(supabase);

    const markNoShows = new MarkNoShows(reservationRepo, checkInRepo);
    const result = await markNoShows.execute({ caravanId });

    return NextResponse.json({
      success: true,
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
