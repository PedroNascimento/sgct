"use server";

/**
 * Server Actions administrativas da Estaca (Spec 001).
 *
 * Artigo I: orquestra use-cases sem misturar regras de negócio na UI.
 * Artigo II.d: restrito a admin_estaca criando admin_ala para a mesma stake_id.
 */

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
} from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { createCaravan } from "@/use-cases/caravan/create-caravan";
import { updateCaravanStatus } from "@/use-cases/caravan/update-caravan-status";
import { confirmWardPayment } from "@/use-cases/payment/confirm-ward-payment";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import type { CaravanStatus } from "@/domain/types/caravan";

export type AdminActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function createWardAdminAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const role = user.app_metadata?.role;
    if (role !== "admin_estaca") {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const wardId = formData.get("wardId") as string;
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const password = formData.get("password") as string;
    const birthDate = formData.get("birthDate") as string;
    const sexo = (formData.get("sexo") as "masculino" | "feminino") || undefined;

    const { data, error } = await supabase.functions.invoke("provision-user", {
      body: {
        operation: "create_ward_admin", wardId, email, fullName,
        password, birthDate, sexo,
      },
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Falha ao criar Admin da Ala.");
    const createdAdmin = data.profile as { full_name: string };

    revalidatePath("/admin");
    return {
      success: true,
      message: `Admin da Ala "${createdAdmin.full_name}" cadastrado com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao cadastrar Admin da Ala.",
    };
  }
}

export async function createCaravanAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const role = user.app_metadata?.role;
    if (role !== "admin_estaca") {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const departureDate = formData.get("departureDate") as string;
    const returnDate = (formData.get("returnDate") as string) || undefined;
    const priceStandard = Number(formData.get("priceStandard"));
    const priceOfficiant = Number(formData.get("priceOfficiant"));
    const seatLimit = formData.get("seatLimit") ? Number(formData.get("seatLimit")) : 50;
    const waitlistLimit = formData.get("waitlistLimit") ? Number(formData.get("waitlistLimit")) : 5;
    const registrationDeadline = formData.get("registrationDeadline") as string;
    const minQuorum = formData.get("minQuorum") ? Number(formData.get("minQuorum")) : 48;
    const quorumCheckDate = formData.get("quorumCheckDate") as string;

    const rawBoarding = formData.get("boardingPointsJson") as string;
    let boardingPoints = [];
    try {
      boardingPoints = JSON.parse(rawBoarding || "[]");
    } catch {
      throw new Error("Formato inválido dos pontos de embarque.");
    }

    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const created = await createCaravan(
      {
        departureDate,
        returnDate,
        priceStandard,
        priceOfficiant,
        seatLimit,
        waitlistLimit,
        registrationDeadline,
        minQuorum,
        quorumCheckDate,
        boardingPoints,
      },
      user.id,
      { caravanRepository, profileRepository }
    );

    revalidatePath("/[estaca_slug]/estaca/calendario");
    revalidatePath("/[estaca_slug]/calendario");
    return {
      success: true,
      message: `Caravana com saída em ${created.departure_date} cadastrada com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao cadastrar caravana.",
    };
  }
}

export async function updateCaravanStatusAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const role = user.app_metadata?.role;
    if (role !== "admin_estaca") {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const caravanId = formData.get("caravanId") as string;
    const status = formData.get("status") as CaravanStatus;

    const caravanRepository = new SupabaseCaravanRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const updated = await updateCaravanStatus(
      { caravanId, status },
      user.id,
      { caravanRepository, profileRepository }
    );

    revalidatePath("/[estaca_slug]/estaca/calendario");
    revalidatePath("/[estaca_slug]/calendario");
    return {
      success: true,
      message: `Status da caravana atualizado para "${updated.status}".`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar status da caravana.",
    };
  }
}

export async function confirmWardPaymentAction(
  reservationId: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);

    const updated = await confirmWardPayment(
      { reservationId, adminId: user.id },
      { reservationRepository: reservationRepo, profileRepository: profileRepo }
    );

    revalidatePath("/[estaca_slug]/ala/reservas");
    return {
      success: true,
      message: `Pagamento da reserva confirmado com sucesso (status: ${updated.status}).`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao confirmar pagamento.",
    };
  }
}

export async function validateWeeklyTransfersAction(
  caravanId: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const caravanRepo = new SupabaseCaravanRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);

    const result = await validateWeeklyTransfers(
      { caravanId, adminId: user.id },
      {
        reservationRepository: reservationRepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
      }
    );

    if (result.skipped) {
      return {
        success: false,
        message: result.reason,
      };
    }

    revalidatePath("/[estaca_slug]/estaca/validacao-semanal");
    return {
      success: true,
      message: `Transferências validadas! ${result.confirmed?.length ?? 0} assentos confirmados, ${result.waitlisted?.length ?? 0} em lista de espera.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao validar transferências semanais.",
    };
  }
}

