"use server";

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { generateCheckInToken } from "@/use-cases/checkin/generate-checkin-token";

export async function requestCheckInTokenAction(reservationId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);

    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      return { success: false, error: "Reserva não encontrada." };
    }

    if (reservation.user_id !== user.id) {
      return { success: false, error: "Acesso não autorizado a esta reserva." };
    }

    const result = await generateCheckInToken(reservationId, {
      reservationRepository,
      caravanRepository,
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao gerar comprovante de embarque.",
    };
  }
}
