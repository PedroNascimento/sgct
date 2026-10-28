import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseNotificationQueueRepository } from "@/infrastructure/supabase/supabase-notification-queue-repository";
import { NotificationEventDispatcher } from "@/infrastructure/notifications/notification-event-dispatcher";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { runCronWithLogging } from "@/infrastructure/logging/cron-logger";

/**
 * Endpoint de cron: Validação Semanal das Transferências (T004.6 / US-004.2 / A11 / M03)
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
    const result = await runCronWithLogging("validate-weekly-transfers", async () => {
      const supabase = createSupabaseServiceClient();
      const reservationRepo = new SupabaseReservationRepository(supabase);
      const caravanRepo = new SupabaseCaravanRepository(supabase);
      const profileRepo = new SupabaseProfileRepository(supabase);
      const queueRepo = new SupabaseNotificationQueueRepository(supabase);

      const dispatcher = new NotificationEventDispatcher({
        queueRepository: queueRepo,
        profileRepository: profileRepo,
        findUserEmail: async (userId: string) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          return authUser?.user?.email ?? null;
        },
      });

      // Busca todas as caravanas ativas com inscrições abertas
      const { data: openCaravans, error } = await supabase
        .from("caravans")
        .select("id")
        .eq("status", "open");

      if (error) {
        throw new Error(`Erro ao buscar caravanas abertas: ${error.message}`);
      }

      const results = [];
      let totalConfirmed = 0;

      for (const caravan of openCaravans ?? []) {
        const res = await validateWeeklyTransfers(
          { caravanId: caravan.id, isAutomatedJob: true },
          { reservationRepository: reservationRepo, caravanRepository: caravanRepo }
        );

        if (res.positionChangeEvents) {
          for (const event of res.positionChangeEvents) {
            try {
              await dispatcher.dispatch(event);
            } catch (dErr) {
              console.warn(`[validate-weekly-transfers] Falha ao despachar notificação para usuário ${event.userId}:`, dErr);
            }
          }
        }

        totalConfirmed += res.confirmed?.length ?? 0;
        results.push({ caravanId: caravan.id, ...res });
      }

      return {
        success: true,
        processedCount: results.length,
        recordsAffected: totalConfirmed,
        details: results,
      };
    });

    return NextResponse.json({
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao processar validação semanal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
