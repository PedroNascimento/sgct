import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { expirePendingReservations } from "@/use-cases/payment/expire-pending-reservations";

/**
 * Endpoint de cron: Expiração Diária de Reservas Pendentes (T004.8 / US-004.4)
 *
 * Agendado para rodar diariamente.
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

    const result = await expirePendingReservations(
      { daysBeforeDeparture: 7 },
      { reservationRepository: reservationRepo }
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao expirar reservas pendentes.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
