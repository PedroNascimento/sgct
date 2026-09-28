"use server";

/**
 * Server Actions para Criação de Reserva e Manifesto de Passageiros.
 * Specs: 003-reservas-concorrencia (US-003.1, US-003.3, US-003.5, US-003.6)
 * Artigos da Constituição:
 * - II: Isolamento por stake_id derivado por trigger
 * - V: Validação Zod e Rate Limiting de 10 req/min por usuário
 */

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { createReservation } from "@/use-cases/reservation/create-reservation";
import { addManifestEntry } from "@/use-cases/reservation/add-manifest-entry";
import type { CreateReservationInput, AddManifestEntryInput } from "@/domain/schemas/reservation";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createReservationAction(
  input: CreateReservationInput
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Não autenticado.");
    }

    // 1. Rate Limiting (docs/SECURITY.md seção 3 / T003.5: 10 req/min por usuário)
    const { data: allowed, error: rateLimitError } = await supabase.rpc(
      "check_reservation_rate_limit"
    );
    if (rateLimitError) {
      throw new Error("Não foi possível validar o limite de tentativas.");
    }
    if (allowed !== true) {
      return {
        success: false,
        error: "Muitas tentativas em pouco tempo. Por favor, aguarde um momento antes de tentar novamente.",
      };
    }

    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const reservation = await createReservation(
      input,
      user.id,
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
  input: AddManifestEntryInput
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Não autenticado.");
    }

    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);

    const entry = await addManifestEntry(
      {
        userId: user.id,
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
