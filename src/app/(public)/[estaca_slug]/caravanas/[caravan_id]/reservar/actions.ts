"use server";

/**
 * Server Actions para Criação de Reserva e Manifesto de Passageiros.
 * Specs: 003-reservas-concorrencia (US-003.1, US-003.3, US-003.5, US-003.6)
 * Artigos da Constituição:
 * - II: Isolamento por stake_id derivado por trigger
 * - V: Validação Zod e Rate Limiting de 10 req/min por usuário
 */

import { createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { createReservation } from "@/use-cases/reservation/create-reservation";
import { addManifestEntry } from "@/use-cases/reservation/add-manifest-entry";
import { reservationRateLimiter } from "@/infrastructure/security/rate-limit";
import type { CreateReservationInput, AddManifestEntryInput } from "@/domain/schemas/reservation";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createReservationAction(
  userId: string,
  input: CreateReservationInput
): Promise<ActionResult> {
  try {
    // 1. Rate Limiting (docs/SECURITY.md seção 3 / T003.5: 10 req/min por usuário)
    const allowed = reservationRateLimiter.check(userId);
    if (!allowed) {
      return {
        success: false,
        error: "Muitas tentativas em pouco tempo. Por favor, aguarde um momento antes de tentar novamente.",
      };
    }

    const supabase = createSupabaseServiceClient();
    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const reservation = await createReservation(
      input,
      userId,
      {
        reservationRepository,
        caravanRepository,
        profileRepository,
      }
    );

    return {
      success: true,
      data: reservation,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado ao processar reserva.",
    };
  }
}

export async function addManifestEntryAction(
  userId: string,
  input: AddManifestEntryInput
): Promise<ActionResult> {
  try {
    const supabase = createSupabaseServiceClient();
    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);

    const entry = await addManifestEntry(
      {
        userId,
        reservationId: input.reservationId,
        fullName: input.fullName,
        birthDate: input.birthDate,
        filiation: input.filiation,
      },
      {
        reservationRepository,
        caravanRepository,
      }
    );

    return {
      success: true,
      data: entry,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao adicionar criança de colo ao manifesto.",
    };
  }
}
