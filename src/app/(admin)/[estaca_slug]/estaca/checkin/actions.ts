"use server";

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseCheckInRepository } from "@/infrastructure/supabase/supabase-checkin-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { validateCheckIn } from "@/use-cases/checkin/validate-checkin";
import {
  syncOfflineCheckIns,
  type OfflineCheckInItem,
} from "@/use-cases/checkin/sync-offline-checkins";
import type { CheckInDirection } from "@/domain/types/checkin";

export async function validateCheckInAction(
  token: string,
  direction: CheckInDirection
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const checkInRepository = new SupabaseCheckInRepository(supabase);
    const reservationRepository = new SupabaseReservationRepository(supabase);

    const checkIn = await validateCheckIn(
      {
        token,
        direction,
        checkedInBy: user.id,
      },
      {
        checkInRepository,
        reservationRepository,
      }
    );

    return { success: true, data: checkIn };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao validar check-in.",
    };
  }
}

export async function syncOfflineCheckInsAction(items: OfflineCheckInItem[]) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const checkInRepository = new SupabaseCheckInRepository(supabase);
    const reservationRepository = new SupabaseReservationRepository(supabase);

    // Garante que o checkedInBy dos itens seja o usuário autenticado
    const enrichedItems = items.map((item) => ({
      ...item,
      checkedInBy: user.id,
    }));

    const result = await syncOfflineCheckIns(enrichedItems, {
      checkInRepository,
      reservationRepository,
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao sincronizar check-ins offline.",
    };
  }
}

export async function loadCaravanCheckInTokensAction(caravanId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const checkInRepository = new SupabaseCheckInRepository(supabase);
    const tokens = await checkInRepository.listValidCaravanTokens(caravanId);

    return { success: true, data: tokens };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao carregar tokens de passageiros.",
    };
  }
}

export async function markNoShowsAction(caravanId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const checkInRepository = new SupabaseCheckInRepository(supabase);
    const reservationRepository = new SupabaseReservationRepository(supabase);

    const { MarkNoShows } = await import("@/use-cases/checkin/mark-no-shows");
    const markNoShows = new MarkNoShows(reservationRepository, checkInRepository);
    const result = await markNoShows.execute({ caravanId });

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao registrar no-shows da caravana.",
    };
  }
}

export async function grantExceptionalCreditAction(input: {
  reservationId: string;
  reason: string;
}) {
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
    const { SupabaseCreditRepository } = await import(
      "@/infrastructure/supabase/supabase-credit-repository"
    );
    const { SupabaseAuditLogRepository } = await import(
      "@/infrastructure/supabase/supabase-audit-log-repository"
    );

    const creditRepository = new SupabaseCreditRepository(supabase);
    const auditLogRepository = new SupabaseAuditLogRepository();

    const { GrantExceptionalCredit } = await import(
      "@/use-cases/checkin/grant-exceptional-credit"
    );

    const grantCredit = new GrantExceptionalCredit(
      reservationRepository,
      creditRepository,
      auditLogRepository
    );

    const result = await grantCredit.execute({
      reservationId: input.reservationId,
      grantedBy: user.id,
      reason: input.reason,
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao conceder crédito excepcional.",
    };
  }
}

export async function getPassengerManifestAction(caravanId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const { SupabaseManifestDataProvider } = await import(
      "@/infrastructure/supabase/supabase-manifest-data-provider"
    );
    const { GeneratePassengerManifest } = await import(
      "@/use-cases/checkin/generate-passenger-manifest"
    );

    const provider = new SupabaseManifestDataProvider(supabase);
    const generator = new GeneratePassengerManifest(provider);
    const manifestRows = await generator.execute(caravanId);

    return { success: true, data: manifestRows };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao gerar manifesto de passageiros.",
    };
  }
}

export async function exportPassengerManifestCsvAction(caravanId: string) {
  try {
    const manifestResult = await getPassengerManifestAction(caravanId);
    if (!manifestResult.success || !manifestResult.data) {
      return { success: false, error: manifestResult.error };
    }

    const { formatManifestAsCsv } = await import(
      "@/use-cases/checkin/generate-passenger-manifest"
    );
    const csvContent = formatManifestAsCsv(manifestResult.data);

    return { success: true, data: csvContent };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro ao exportar manifesto em CSV.",
    };
  }
}



