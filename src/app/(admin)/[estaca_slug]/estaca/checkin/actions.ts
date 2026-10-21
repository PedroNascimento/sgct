"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseCheckInRepository } from "@/infrastructure/supabase/supabase-checkin-repository";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { validateCheckIn } from "@/use-cases/checkin/validate-checkin";
import {
  syncOfflineCheckIns,
  type OfflineCheckInItem,
} from "@/use-cases/checkin/sync-offline-checkins";
import type { CheckInDirection } from "@/domain/types/checkin";

const validateCheckInInputSchema = z.object({
  token: z.string().min(1, "Token de check-in é obrigatório"),
  direction: z.enum(["ida", "volta"], {
    errorMap: () => ({ message: "Direção deve ser 'ida' ou 'volta'" }),
  }),
});

const offlineItemSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  direction: z.enum(["ida", "volta"]),
  checkedInAt: z.string().optional(),
  offlineCheckedInAt: z.string().optional(),
});

const grantCreditInputSchema = z.object({
  reservationId: z.string().uuid("ID de reserva inválido"),
  reason: z.string().min(5, "Motivo deve conter no mínimo 5 caracteres"),
});

export async function validateCheckInAction(
  token: string,
  direction: CheckInDirection
) {
  try {
    validateCheckInInputSchema.parse({ token, direction });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const { checkRateLimit, RATE_LIMIT_CONFIGS } = await import(
      "@/infrastructure/rate-limit/rate-limiter"
    );
    const rateLimit = await checkRateLimit(
      `scanner:${user.id}`,
      RATE_LIMIT_CONFIGS.SCANNER.limit,
      RATE_LIMIT_CONFIGS.SCANNER.windowSeconds,
      supabase
    );
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Limite de leituras de check-in excedido (máximo 30 leituras/minuto). Aguarde um momento.",
      };
    }

    const checkInRepository = new SupabaseCheckInRepository(supabase);
    const reservationRepository = new SupabaseReservationRepository(supabase);
    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const checkIn = await validateCheckIn(
      {
        token,
        direction,
        checkedInBy: user.id,
      },
      {
        checkInRepository,
        reservationRepository,
        caravanRepository,
        profileRepository,
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
    const validatedItems = z.array(offlineItemSchema).parse(items);

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

    // Garante que o checkedInBy dos itens seja o usuário autenticado e unifica o timestamp (A08)
    const enrichedItems: OfflineCheckInItem[] = validatedItems.map((item) => ({
      token: item.token,
      direction: item.direction,
      checkedInBy: user.id,
      checkedInAt: item.checkedInAt || item.offlineCheckedInAt || new Date().toISOString(),
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
    z.string().uuid("ID de caravana inválido").parse(caravanId);

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
    z.string().uuid("ID de caravana inválido").parse(caravanId);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);
    const caravan = await caravanRepository.findById(caravanId);
    if (!caravan) {
      return { success: false, error: "Caravana não encontrada." };
    }
    const profile = await profileRepository.findById(user.id);
    const isLeader = caravan.caravan_leader_id === user.id;
    const isStakeAdmin =
      profile?.role === "admin_estaca" &&
      profile.stake_id === caravan.stake_id &&
      profile.is_active;

    if (!isLeader && !isStakeAdmin) {
      return {
        success: false,
        error: "Não autorizado: apenas o Líder da Caravana ou Admin da Estaca podem marcar no-shows.",
      };
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
    grantCreditInputSchema.parse(input);

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
    z.string().uuid("ID de caravana inválido").parse(caravanId);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);
    const caravan = await caravanRepository.findById(caravanId);
    if (!caravan) {
      return { success: false, error: "Caravana não encontrada." };
    }
    const profile = await profileRepository.findById(user.id);
    const isLeader = caravan.caravan_leader_id === user.id;
    const isStakeAdmin =
      profile?.role === "admin_estaca" &&
      profile.stake_id === caravan.stake_id &&
      profile.is_active;

    if (!isLeader && !isStakeAdmin) {
      return {
        success: false,
        error: "Não autorizado: apenas o Líder da Caravana ou Admin da Estaca podem acessar o manifesto.",
      };
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
    z.string().uuid("ID de caravana inválido").parse(caravanId);

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



