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

export interface CreateGuestReservationActionInput {
  caravanId: string;
  seatNumber: number;
  originStakeName: string;
  originWardName: string;
  category?: "standard" | "officiant";
  participantType?: "adulto" | "jovem" | "crianca" | "oficiante" | "investidura" | "selamento" | "missionario_servico";
  boardingPointId?: string | null;
}

export async function createGuestReservationAction(
  input: CreateGuestReservationActionInput
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

    // 1. Rate Limiting (10 req/min por usuário)
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

    const { createGuestReservation } = await import("@/use-cases/guest/create-guest-reservation");
    const { SupabaseGuestRepository } = await import("@/infrastructure/supabase/supabase-guest-repository");

    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);
    const guestRepository = new SupabaseGuestRepository(supabase);

    const result = await createGuestReservation(
      {
        userId: user.id,
        caravanId: input.caravanId,
        seatNumber: input.seatNumber,
        originStakeName: input.originStakeName,
        originWardName: input.originWardName,
        category: input.category ?? "standard",
        participantType: input.participantType ?? "adulto",
        boardingPointId: input.boardingPointId,
      },
      {
        reservationRepository,
        caravanRepository,
        profileRepository,
        guestRepository,
      }
    );

    return {
      success: true,
      data: result.reservation,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado ao processar reserva de convidado.",
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

export async function uploadMinorApprovalFormAction(
  formData: FormData
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

    const reservationId = formData.get("reservationId") as string;
    const file = formData.get("file") as File;

    if (!reservationId || !file) {
      throw new Error("Reserva e arquivo são obrigatórios.");
    }

    const { uploadMinorApprovalForm } = await import(
      "@/use-cases/minors/upload-minor-approval-form"
    );
    const {
      SupabaseMinorRepository,
      SupabaseStoragePort,
    } = await import("@/infrastructure/supabase/supabase-minor-repository");

    const minorRepository = new SupabaseMinorRepository(supabase);
    const storagePort = new SupabaseStoragePort(supabase);
    const reservationRepository = new SupabaseReservationRepository(supabase);

    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = Buffer.from(arrayBuffer);

    const form = await uploadMinorApprovalForm(
      {
        userId: user.id,
        reservationId,
        fileName: file.name,
        fileType: file.type as any,
        fileSize: file.size,
        fileBytes,
      },
      {
        minorRepository,
        storagePort,
        reservationRepository,
      }
    );

    return {
      success: true,
      data: form,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao enviar termo de autorização.",
    };
  }
}
