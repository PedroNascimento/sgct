"use server";

/**
 * Server Actions administrativas da Estaca (Spec 001).
 *
 * Artigo I: orquestra use-cases sem misturar regras de negócio na UI.
 * Artigo II.d: restrito a admin_estaca criando admin_ala para a mesma stake_id.
 *
 * DECISÃO D32: Admin Estaca não cria usuários novos — apenas promove membros já cadastrados.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/infrastructure/supabase/server";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/supabase-profile-repository";
import { SupabaseCaravanRepository } from "@/infrastructure/supabase/supabase-caravan-repository";
import { createCaravan } from "@/use-cases/caravan/create-caravan";
import { updateCaravanStatus } from "@/use-cases/caravan/update-caravan-status";
import { confirmWardPayment } from "@/use-cases/payment/confirm-ward-payment";
import { validateWeeklyTransfers } from "@/use-cases/payment/validate-weekly-transfers";
import { SupabaseReservationRepository } from "@/infrastructure/supabase/supabase-reservation-repository";
import { SupabaseWardRepository } from "@/infrastructure/supabase/supabase-ward-repository";
import { createWard } from "@/use-cases/ward/create-ward";
import { updateWard } from "@/use-cases/ward/update-ward";
import { toggleWardStatus } from "@/use-cases/ward/toggle-ward-status";
import { deleteWard } from "@/use-cases/ward/delete-ward";
import { requestSeatSwap } from "@/use-cases/swap/request-seat-swap";
import { approveSeatSwap } from "@/use-cases/swap/approve-seat-swap";
import { SupabaseSwapRepository } from "@/infrastructure/supabase/supabase-swap-repository";
import { SupabaseCreditRepository } from "@/infrastructure/supabase/supabase-credit-repository";
import type { CaravanStatus } from "@/domain/types/caravan";
import type { WardWithStats } from "@/domain/types/ward";
import { formatDate } from "@/components/ui/format";

export type AdminActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Busca um membro existente pelo e-mail para promovê-lo a Admin de Ala.
 * O membro deve estar na mesma Estaca do Admin Estaca logado.
 * DECISÃO D32: apenas membros já cadastrados podem ser promovidos.
 */
const searchMemberWardAdminSchema = z.object({
  email: z.string().email("E-mail inválido"),
  stakeId: z.string().min(1, "ID de Estaca inválido"),
});

const promoteToWardAdminSchema = z.object({
  userId: z.string({ invalid_type_error: "Selecione um membro válido", required_error: "Selecione um membro válido" }).min(1, "Selecione um membro válido"),
  wardId: z.string({ invalid_type_error: "Selecione uma Ala válida", required_error: "Selecione uma Ala válida" }).min(1, "Selecione uma Ala válida"),
});

export async function searchMemberForWardAdminPromotion(
  email: string,
  stakeId: string
): Promise<{ id: string; full_name: string; role: string; ward_id: string | null; ward_name: string | null } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    searchMemberWardAdminSchema.parse({ email, stakeId });

    const callerRole = userData.user.app_metadata?.role;
    const callerStakeId = userData.user.app_metadata?.stake_id;
    if (callerRole !== "admin_estaca" || callerStakeId !== stakeId) return null;

    const serviceClient = createSupabaseServiceClient();

    // Buscar usuário pelo e-mail
    const { data: authUsers } = await serviceClient.auth.admin.listUsers();
    const authUser = authUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) return null;

    // Verificar que pertence à mesma Estaca
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, ward_id, wards(name)")
      .eq("id", authUser.id)
      .eq("stake_id", stakeId)
      .maybeSingle();

    if (!profile) return null;

    const wardData = Array.isArray(profile.wards) ? profile.wards[0] : profile.wards;
    return {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      ward_id: profile.ward_id,
      ward_name: (wardData as { name: string } | null)?.name ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Promove um membro existente a Admin de Ala.
 * REGRA: O usuário já deve existir como membro na mesma Estaca.
 * Não cria usuários novos — apenas eleva permissão.
 * Artigo II.d: ward_id deve pertencer à mesma stake_id do admin logado.
 */
export async function promoteToWardAdminAction(
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
    const callerRole = user.app_metadata?.role;
    const callerStakeId = user.app_metadata?.stake_id;

    if (callerRole !== "admin_estaca" || !callerStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const validated = promoteToWardAdminSchema.parse({
      userId: formData.get("userId"),
      wardId: formData.get("wardId"),
    });

    const userId = validated.userId;
    const wardId = validated.wardId;

    const serviceClient = createSupabaseServiceClient();


    // Verificar que a Ala pertence à Estaca do admin (Artigo II.d)
    const { data: ward } = await serviceClient
      .from("wards")
      .select("id, stake_id, name")
      .eq("id", wardId)
      .maybeSingle();

    if (!ward || ward.stake_id !== callerStakeId) {
      throw new Error("Ala não encontrada ou não pertence à sua Estaca.");
    }

    // Verificar que o membro existe e pertence à mesma Estaca
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, stake_id")
      .eq("id", userId)
      .eq("stake_id", callerStakeId)
      .maybeSingle();

    if (!profile) {
      throw new Error("Membro não encontrado nesta Estaca.");
    }

    if (profile.role === "admin_ala") {
      throw new Error(`${profile.full_name} já é Admin de Ala.`);
    }

    // Elevar permissão e vincular à Ala selecionada
    const { error: pError } = await serviceClient
      .from("profiles")
      .update({ role: "admin_ala", ward_id: wardId })
      .eq("id", userId);

    if (pError) throw new Error(pError.message);

    // Sincronizar claims no Auth metadata
    await serviceClient.auth.admin.updateUserById(userId, {
      app_metadata: {
        role: "admin_ala",
        stake_id: callerStakeId,
        ward_id: wardId,
      },
    });

    revalidatePath("/[estaca_slug]/estaca/equipe");
    return {
      success: true,
      message: `"${profile.full_name}" foi promovido(a) a Admin da Ala ${ward.name} com sucesso!`,
    };
  } catch (err: unknown) {
    let message = "Erro ao promover membro a Admin de Ala.";
    if (err instanceof z.ZodError) {
      message = err.errors.map((e) => e.message).join("; ");
    } else if (err instanceof Error) {
      message = err.message;
    }
    return {
      success: false,
      error: message,
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

    const rawBoarding = (formData.get("boardingPoints") ||
      formData.get("boardingPointsJson")) as string;
    let boardingPoints = [];
    try {
      boardingPoints = JSON.parse(rawBoarding || "[]");
    } catch {
      throw new Error("Formato inválido dos pontos de embarque.");
    }

    if (Array.isArray(boardingPoints)) {
      boardingPoints = boardingPoints.filter(
        (bp: { name?: string; boardingTime?: string }) =>
          bp && typeof bp.name === "string" && bp.name.trim().length > 0
      );
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
      message: `Caravana com saída em ${formatDate(created.departure_date)} cadastrada com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao cadastrar caravana.",
    };
  }
}

const updateCaravanStatusSchema = z.object({
  caravanId: z.string().min(1, "ID de caravana inválido"),
  status: z.enum(["rascunho", "aberta", "em_andamento", "concluida", "cancelada"], {
    errorMap: () => ({ message: "Status de caravana inválido" }),
  }),
});

const editCaravanInputSchema = z.object({
  caravanId: z.string().min(1, "ID de caravana inválido"),
  departureDate: z.string().min(1, "Data de saída é obrigatória").optional().nullable(),
  returnDate: z.string().nullable().optional(),
  priceStandard: z.number().nonnegative().optional(),
  priceOfficiant: z.number().nonnegative().optional(),
  seatLimit: z.number().positive().optional(),
  waitlistLimit: z.number().nonnegative().optional(),
  registrationDeadline: z.string().optional().nullable(),
  minQuorum: z.number().positive().optional(),
  quorumCheckDate: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

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

    const validated = updateCaravanStatusSchema.parse({
      caravanId: formData.get("caravanId"),
      status: formData.get("status"),
    });

    const caravanId = validated.caravanId;
    const status = validated.status as CaravanStatus;

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

    z.string().min(1, "ID de reserva inválido").parse(reservationId);

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

    z.string().min(1, "ID de caravana inválido").parse(caravanId);

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

/**
 * Edita dados de uma caravana existente (Admin Estaca).
 */
export async function editCaravanAction(
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
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const validated = editCaravanInputSchema.parse({
      caravanId: formData.get("caravanId"),
      departureDate: formData.get("departureDate") || undefined,
      returnDate: (formData.get("returnDate") as string) || null,
      priceStandard: formData.get("priceStandard") ? Number(formData.get("priceStandard")) : undefined,
      priceOfficiant: formData.get("priceOfficiant") ? Number(formData.get("priceOfficiant")) : undefined,
      seatLimit: formData.get("seatLimit") ? Number(formData.get("seatLimit")) : undefined,
      waitlistLimit: formData.get("waitlistLimit") ? Number(formData.get("waitlistLimit")) : undefined,
      registrationDeadline: formData.get("registrationDeadline") || undefined,
      minQuorum: formData.get("minQuorum") ? Number(formData.get("minQuorum")) : undefined,
      quorumCheckDate: formData.get("quorumCheckDate") || undefined,
      status: formData.get("status") || undefined,
    });

    const caravanId = validated.caravanId;

    // Verificar se a caravana pertence à mesma Estaca
    const { data: existingCaravan } = await supabase
      .from("caravans")
      .select("id, stake_id")
      .eq("id", caravanId)
      .single();

    if (!existingCaravan || existingCaravan.stake_id !== userStakeId) {
      throw new Error("Caravana não encontrada ou não pertence à sua Estaca.");
    }

    const updatePayload: Record<string, unknown> = {};
    if (validated.departureDate !== undefined) updatePayload.departure_date = validated.departureDate;
    if (validated.returnDate !== undefined) updatePayload.return_date = validated.returnDate;
    if (validated.priceStandard !== undefined) updatePayload.price_standard = validated.priceStandard;
    if (validated.priceOfficiant !== undefined) updatePayload.price_officiant = validated.priceOfficiant;
    if (validated.seatLimit !== undefined) updatePayload.seat_limit = validated.seatLimit;
    if (validated.waitlistLimit !== undefined) updatePayload.waitlist_limit = validated.waitlistLimit;
    if (validated.registrationDeadline !== undefined) updatePayload.registration_deadline = validated.registrationDeadline;
    if (validated.minQuorum !== undefined) updatePayload.min_quorum = validated.minQuorum;
    if (validated.quorumCheckDate !== undefined) updatePayload.quorum_check_date = validated.quorumCheckDate;
    if (validated.status !== undefined) updatePayload.status = validated.status;

    const { error: updateError } = await supabase
      .from("caravans")
      .update(updatePayload)
      .eq("id", caravanId);

    if (updateError) {
      throw new Error(`Falha ao atualizar caravana: ${updateError.message}`);
    }

    revalidatePath("/[estaca_slug]/estaca/calendario");
    return {
      success: true,
      message: "Caravana atualizada com sucesso!",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao editar caravana.",
    };
  }
}

/**
 * Confirma individualmente uma transferência semanal (Admin Estaca).
 */
export async function confirmSingleTransferAction(
  reservationId: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    z.string().min(1, "ID de reserva inválido").parse(reservationId);

    const user = userData.user;
    const role = user.app_metadata?.role;
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    // Buscar reserva e validar Estaca
    const { data: reservation } = await supabase
      .from("reservations")
      .select("id, stake_id, status")
      .eq("id", reservationId)
      .single();

    if (!reservation || reservation.stake_id !== userStakeId) {
      throw new Error("Reserva não encontrada ou não pertence à sua Estaca.");
    }

    if (reservation.status !== "pago_ala") {
      throw new Error(`Apenas reservas com status 'pago_ala' podem ser confirmadas.`);
    }

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "confirmado",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/[estaca_slug]/estaca/validacao-semanal");
    return {
      success: true,
      message: "Transferência individual confirmada com sucesso!",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao confirmar transferência.",
    };
  }
}

/**
 * Recusa/devolve um repasse para a Ala reavaliar (Admin Estaca).
 */
export async function rejectTransferAction(
  reservationId: string,
  reason?: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    z.string().min(1, "ID de reserva inválido").parse(reservationId);

    const user = userData.user;
    const role = user.app_metadata?.role;
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    // Buscar reserva e validar Estaca
    const { data: reservation } = await supabase
      .from("reservations")
      .select("id, stake_id, status")
      .eq("id", reservationId)
      .single();

    if (!reservation || reservation.stake_id !== userStakeId) {
      throw new Error("Reserva não encontrada ou não pertence à sua Estaca.");
    }

    // Retorna status para pendente para a Ala conferir novamente
    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "pendente",
      })
      .eq("id", reservationId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/[estaca_slug]/estaca/validacao-semanal");
    revalidatePath("/[estaca_slug]/ala/reservas");
    return {
      success: true,
      message: "Repasse recusado e retornado para a Ala realizar nova conferência.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao recusar repasse.",
    };
  }
}

export type EstacaMemberItem = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  ward_id: string | null;
  ward_name: string | null;
  created_at: string;
};

/**
 * Lista todos os membros e administradores de Ala da Estaca informada.
 * Apenas acessível por Admin da Estaca para a sua própria Estaca.
 */
export async function getEstacaMembersList(stakeId: string): Promise<EstacaMemberItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    z.string().min(1, "ID de Estaca inválido").parse(stakeId);

    const callerRole = userData.user.app_metadata?.role;
    const callerStakeId = userData.user.app_metadata?.stake_id;
    if (callerRole !== "admin_estaca" || callerStakeId !== stakeId) return [];

    const serviceClient = createSupabaseServiceClient();

    // 1. Buscar profiles da mesma stake com role 'admin_ala' ou 'member'
    const { data: profiles, error: pError } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, is_active, ward_id, created_at, wards(name)")
      .eq("stake_id", stakeId)
      .in("role", ["admin_ala", "member"])
      .order("full_name", { ascending: true });

    if (pError || !profiles) return [];

    // 2. Buscar usuários do auth para associar os e-mails
    const { data: authData } = await serviceClient.auth.admin.listUsers();
    const userEmails = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return profiles.map((p) => {
      const wardData = Array.isArray(p.wards) ? p.wards[0] : p.wards;
      return {
        id: p.id,
        full_name: p.full_name,
        email: userEmails.get(p.id) ?? "",
        role: p.role,
        is_active: p.is_active,
        ward_id: p.ward_id,
        ward_name: (wardData as { name: string } | null)?.name ?? null,
        created_at: p.created_at,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Revoga a permissão de Admin de Ala de um usuário, retornando-o para Membro Comum.
 */
export async function demoteWardAdminAction(userId: string): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    z.string().min(1, "ID de usuário inválido").parse(userId);

    const callerRole = userData.user.app_metadata?.role;
    const callerStakeId = userData.user.app_metadata?.stake_id;

    if (callerRole !== "admin_estaca" || !callerStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const serviceClient = createSupabaseServiceClient();

    // Verificar que o perfil pertence à mesma Estaca
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, stake_id, ward_id")
      .eq("id", userId)
      .eq("stake_id", callerStakeId)
      .maybeSingle();

    if (!profile) {
      throw new Error("Membro não encontrado nesta Estaca.");
    }

    // Atualizar role para member no profile
    const { error: pError } = await serviceClient
      .from("profiles")
      .update({ role: "member" })
      .eq("id", userId);

    if (pError) throw new Error(pError.message);

    // Sincronizar claims no Auth metadata
    await serviceClient.auth.admin.updateUserById(userId, {
      app_metadata: {
        role: "member",
        stake_id: callerStakeId,
        ward_id: profile.ward_id,
      },
    });

    revalidatePath("/[estaca_slug]/estaca/equipe");
    return {
      success: true,
      message: `Permissão de Admin de Ala revogada para "${profile.full_name}". Agora é Membro Comum.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alterar permissão do membro.",
    };
  }
}

/**
 * Promove um membro comum existente a Admin de Ala diretamente a partir da lista de membros.
 * REGRA (D32): O usuário deve pertencer à mesma Estaca e ter uma Ala válida vinculada.
 * Apenas Admin de Estaca ativo pode promover.
 */
export async function promoteWardMemberAction(
  userId: string,
  wardId: string
): Promise<AdminActionState> {
  z.object({
    userId: z.string().min(1, "ID de usuário inválido"),
    wardId: z.string().min(1, "ID de Ala inválido"),
  }).parse({ userId, wardId });

  const formData = new FormData();
  formData.set("userId", userId);
  formData.set("wardId", wardId);
  return promoteToWardAdminAction({ success: false }, formData);
}

/**
 * Ativa ou desativa um usuário membro/admin da Estaca.
 */
export async function toggleWardMemberStatusAction(
  userId: string,
  isActive: boolean
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    z.object({
      userId: z.string().min(1, "ID de usuário inválido"),
      isActive: z.boolean(),
    }).parse({ userId, isActive });

    const callerRole = userData.user.app_metadata?.role;
    const callerStakeId = userData.user.app_metadata?.stake_id;

    if (callerRole !== "admin_estaca" || !callerStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const serviceClient = createSupabaseServiceClient();

    // Garantir isolamento por stake_id
    const { error } = await serviceClient
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("stake_id", callerStakeId);

    if (error) throw new Error(error.message);

    revalidatePath("/[estaca_slug]/estaca/equipe");
    return {
      success: true,
      message: `Status atualizado com sucesso (${isActive ? "Ativado" : "Desativado"}).`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alterar status.",
    };
  }
}

/**
 * Cadastra uma nova Ala na Estaca (Admin Estaca).
 */
export async function createWardAction(
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
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const rawName = formData.get("name");
    const name = z.string().min(2, "Nome da Ala deve ter no mínimo 2 caracteres").parse(rawName);

    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const created = await createWard(
      { name },
      user.id,
      { wardRepository, profileRepository }
    );

    revalidatePath("/[estaca_slug]/estaca/alas");
    revalidatePath("/[estaca_slug]/estaca/equipe");
    revalidatePath("/[estaca_slug]/cadastro");

    return {
      success: true,
      message: `Ala "${created.name}" cadastrada com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao cadastrar Ala.",
    };
  }
}

/**
 * Atualiza o nome de uma Ala existente (Admin Estaca).
 */
export async function updateWardAction(
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
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    const validated = z.object({
      wardId: z.string().min(1, "ID de Ala inválido"),
      name: z.string().min(2, "Nome da Ala deve ter no mínimo 2 caracteres"),
    }).parse({
      wardId: formData.get("wardId"),
      name: formData.get("name"),
    });

    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const updated = await updateWard(
      { wardId: validated.wardId, name: validated.name },
      user.id,
      { wardRepository, profileRepository }
    );

    revalidatePath("/[estaca_slug]/estaca/alas");
    revalidatePath("/[estaca_slug]/estaca/equipe");
    revalidatePath("/[estaca_slug]/cadastro");

    return {
      success: true,
      message: `Ala "${updated.name}" atualizada com sucesso!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar Ala.",
    };
  }
}

/**
 * Altera o status (ativo/inativo) de uma Ala (Admin Estaca).
 */
export async function toggleWardStatusAction(
  wardId: string,
  isActive: boolean
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const role = user.app_metadata?.role;
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    z.object({
      wardId: z.string().min(1, "ID de Ala inválido"),
      isActive: z.boolean(),
    }).parse({ wardId, isActive });

    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const updated = await toggleWardStatus(
      { wardId, isActive },
      user.id,
      { wardRepository, profileRepository }
    );

    revalidatePath("/[estaca_slug]/estaca/alas");
    revalidatePath("/[estaca_slug]/estaca/equipe");
    revalidatePath("/[estaca_slug]/cadastro");

    return {
      success: true,
      message: `Ala "${updated.name}" foi ${isActive ? "ativada" : "inativada"} com sucesso.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alterar status da Ala.",
    };
  }
}

/**
 * Exclui definitivamente uma Ala sem membros/reservas (Admin Estaca).
 */
export async function deleteWardAction(
  wardId: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !userData.user) {
      throw new Error("Não autenticado.");
    }

    const user = userData.user;
    const role = user.app_metadata?.role;
    const userStakeId = user.app_metadata?.stake_id;

    if (role !== "admin_estaca" || !userStakeId) {
      throw new Error("Acesso negado: requer perfil de Admin da Estaca.");
    }

    z.string().min(1, "ID de Ala inválido").parse(wardId);

    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    await deleteWard(
      wardId,
      user.id,
      { wardRepository, profileRepository }
    );

    revalidatePath("/[estaca_slug]/estaca/alas");
    revalidatePath("/[estaca_slug]/estaca/equipe");
    revalidatePath("/[estaca_slug]/cadastro");

    return {
      success: true,
      message: "Ala excluída com sucesso.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir Ala.",
    };
  }
}

/**
 * Lista as Alas da Estaca com contagem de membros e admins.
 */
export async function getWardsWithStats(stakeId: string): Promise<WardWithStats[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    z.string().min(1, "ID de Estaca inválido").parse(stakeId);

    const callerRole = userData.user.app_metadata?.role;
    const callerStakeId = userData.user.app_metadata?.stake_id;
    if (callerRole !== "admin_estaca" || callerStakeId !== stakeId) return [];

    const serviceClient = createSupabaseServiceClient();

    const [wardsRes, profilesRes] = await Promise.all([
      serviceClient
        .from("wards")
        .select("id, stake_id, name, is_active, created_at")
        .eq("stake_id", stakeId)
        .order("name", { ascending: true }),
      serviceClient
        .from("profiles")
        .select("ward_id, role")
        .eq("stake_id", stakeId)
        .not("ward_id", "is", null),
    ]);

    if (wardsRes.error || !wardsRes.data) return [];

    const profiles = profilesRes.data ?? [];
    const memberCounts = new Map<string, number>();
    const adminCounts = new Map<string, number>();

    for (const p of profiles) {
      if (!p.ward_id) continue;
      if (p.role === "admin_ala") {
        adminCounts.set(p.ward_id, (adminCounts.get(p.ward_id) ?? 0) + 1);
      } else {
        memberCounts.set(p.ward_id, (memberCounts.get(p.ward_id) ?? 0) + 1);
      }
    }

    return wardsRes.data.map((w) => ({
      id: w.id,
      stake_id: w.stake_id,
      name: w.name,
      is_active: w.is_active ?? true,
      created_at: w.created_at,
      member_count: memberCounts.get(w.id) ?? 0,
      admin_count: adminCounts.get(w.id) ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Server Action para registrar uma solicitação de permuta (T005.10 / US-005.2).
 */
export async function registerSeatSwapAction(
  estacaSlug: string,
  input: {
    reservationId: string;
    newHolderFullName: string;
    newHolderDocument?: string;
  }
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.object({
      estacaSlug: z.string().min(1, "Slug da Estaca é obrigatório"),
      reservationId: z.string().min(1, "ID de reserva inválido"),
      newHolderFullName: z.string().min(3, "Nome completo do novo titular deve ter no mínimo 3 caracteres"),
      newHolderDocument: z.string().optional(),
    }).parse({ estacaSlug, ...input });

    const reservationRepo = new SupabaseReservationRepository(supabase);
    const swapRepo = new SupabaseSwapRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);

    await requestSeatSwap(
      {
        reservationId: input.reservationId,
        newHolderFullName: input.newHolderFullName,
        newHolderDocument: input.newHolderDocument,
        requestedBy: user.id,
      },
      {
        reservationRepository: reservationRepo,
        swapRepository: swapRepo,
        profileRepository: profileRepo,
      }
    );

    revalidatePath(`/${estacaSlug}/estaca/permutas`);
    return { success: true, message: "Permuta registrada com sucesso!" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao registrar permuta.";
    return { success: false, error: message };
  }
}

/**
 * Server Action para aprovar uma solicitação de permuta (T005.10 / US-005.2).
 */
export async function approveSeatSwapAction(
  estacaSlug: string,
  swapRequestId: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.object({
      estacaSlug: z.string().min(1, "Slug da Estaca é obrigatório"),
      swapRequestId: z.string().min(1, "ID de solicitação de permuta inválido"),
    }).parse({ estacaSlug, swapRequestId });

    const swapRepo = new SupabaseSwapRepository(supabase);
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const caravanRepo = new SupabaseCaravanRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);
    const creditRepo = new SupabaseCreditRepository(supabase);

    await approveSeatSwap(
      {
        swapRequestId,
        approverId: user.id,
      },
      {
        swapRepository: swapRepo,
        reservationRepository: reservationRepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
        creditRepository: creditRepo,
      }
    );

    revalidatePath(`/${estacaSlug}/estaca/permutas`);
    return { success: true, message: "Permuta aprovada com sucesso!" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao aprovar permuta.";
    return { success: false, error: message };
  }
}

/**
 * Server Action para aprovação/rejeição de formulário de menor (T006.11 / US-006.3 / T010.5).
 */
export async function evaluateMinorFormAction(
  estacaSlug: string,
  formId: string,
  status: "approved" | "rejected"
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.object({
      estacaSlug: z.string().min(1, "Slug da Estaca é obrigatório"),
      formId: z.string().min(1, "ID de formulário inválido"),
      status: z.enum(["approved", "rejected"], {
        errorMap: () => ({ message: "Status deve ser 'approved' ou 'rejected'" }),
      }),
    }).parse({ estacaSlug, formId, status });

    const { approveMinorForm } = await import("@/use-cases/minors/approve-minor-form");
    const {
      SupabaseMinorRepository,
      SupabaseAuditLogPort,
    } = await import(
      "@/infrastructure/supabase/supabase-minor-repository"
    );

    const minorRepo = new SupabaseMinorRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);
    const serviceClient = createSupabaseServiceClient();
    const auditLogPort = new SupabaseAuditLogPort(serviceClient);

    await approveMinorForm(
      {
        formId,
        adminId: user.id,
        status,
      },
      {
        minorRepository: minorRepo,
        profileRepository: profileRepo,
        auditLogPort,
      }
    );

    revalidatePath(`/${estacaSlug}/ala/menores`);
    revalidatePath(`/${estacaSlug}/ala/reservas`);

    return {
      success: true,
      message: status === "approved" ? "Formulário aprovado com sucesso!" : "Formulário rejeitado.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao avaliar formulário.";
    return { success: false, error: message };
  }
}

/**
 * Server Action para obter URL temporária de visualização de formulário de menor (T006.8).
 */
export async function getMinorDocumentViewUrlAction(
  formId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.string().min(1, "ID de formulário inválido").parse(formId);

    const { getMinorDocumentUrl } = await import("@/use-cases/minors/get-minor-document-url");
    const {
      SupabaseMinorRepository,
      SupabaseStoragePort,
      SupabaseAuditLogPort,
    } = await import("@/infrastructure/supabase/supabase-minor-repository");

    const minorRepo = new SupabaseMinorRepository(supabase);
    const storagePort = new SupabaseStoragePort(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);
    const serviceClient = createSupabaseServiceClient();
    const auditLogPort = new SupabaseAuditLogPort(serviceClient);

    const result = await getMinorDocumentUrl(
      {
        formId,
        adminId: user.id,
      },
      {
        minorRepository: minorRepo,
        storagePort,
        profileRepository: profileRepo,
        auditLogPort,
      }
    );

    return { success: true, url: result.signedUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao obter documento.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Aprovação de Auxílio Financeiro pelo Admin da Ala/Estaca (Spec 012 / T012.4).
 */
export async function approveAidAction(
  aidRequestId: string,
  estacaSlug: string,
  notes?: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.object({
      aidRequestId: z.string().min(1, "ID de auxílio inválido"),
      estacaSlug: z.string().min(1, "Slug da Estaca é obrigatório"),
      notes: z.string().optional(),
    }).parse({ aidRequestId, estacaSlug, notes });

    const { approveAid } = await import("@/use-cases/aid/process-aid");
    const { SupabaseAidRepository } = await import("@/infrastructure/supabase/supabase-aid-repository");
    const { SupabaseNotificationQueueRepository } = await import("@/infrastructure/supabase/supabase-notification-queue-repository");

    const aidRepo = new SupabaseAidRepository(supabase);
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);
    const notificationQueueRepository = new SupabaseNotificationQueueRepository(supabase);

    await approveAid(
      {
        aidRequestId,
        approverId: user.id,
        notes: notes ?? null,
      },
      {
        aidRepository: aidRepo,
        reservationRepository: reservationRepo,
        profileRepository: profileRepo,
        notificationQueueRepository,
      }
    );

    revalidatePath(`/${estacaSlug}/ala/reservas`);
    revalidatePath(`/${estacaSlug}/estaca/calendario`);
    return { success: true, message: "Auxílio financeiro aprovado com sucesso! A reserva avançou para 'Pago na Ala'." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao aprovar auxílio.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Reprovação de Auxílio Financeiro pelo Admin da Ala/Estaca (Spec 012 / T012.5).
 */
export async function rejectAidAction(
  aidRequestId: string,
  estacaSlug: string,
  reason?: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.object({
      aidRequestId: z.string().min(1, "ID de auxílio inválido"),
      estacaSlug: z.string().min(1, "Slug da Estaca é obrigatório"),
      reason: z.string().optional(),
    }).parse({ aidRequestId, estacaSlug, reason });

    const { rejectAid } = await import("@/use-cases/aid/process-aid");
    const { SupabaseAidRepository } = await import("@/infrastructure/supabase/supabase-aid-repository");
    const { SupabaseNotificationQueueRepository } = await import("@/infrastructure/supabase/supabase-notification-queue-repository");

    const aidRepo = new SupabaseAidRepository(supabase);
    const reservationRepo = new SupabaseReservationRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);
    const notificationQueueRepository = new SupabaseNotificationQueueRepository(supabase);

    await rejectAid(
      {
        aidRequestId,
        rejecterId: user.id,
        reason: reason ?? null,
      },
      {
        aidRepository: aidRepo,
        reservationRepository: reservationRepo,
        profileRepository: profileRepo,
        notificationQueueRepository,
      }
    );

    revalidatePath(`/${estacaSlug}/ala/reservas`);
    revalidatePath(`/${estacaSlug}/estaca/calendario`);
    return { success: true, message: "Auxílio reprovado. A reserva correspondente foi cancelada." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao reprovar auxílio.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Confirmação de Repasse de Convidado Inter-Estaca pelo Admin da Estaca (Spec 013 / T013.5 / T013.11).
 */
export async function confirmGuestTransferAction(
  transferConfirmationId: string,
  estacaSlug: string
): Promise<AdminActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    z.object({
      transferConfirmationId: z.string().min(1, "ID de confirmação inválido"),
      estacaSlug: z.string().min(1, "Slug da Estaca é obrigatório"),
    }).parse({ transferConfirmationId, estacaSlug });

    const { confirmGuestTransfer } = await import("@/use-cases/guest/confirm-guest-transfer");
    const { SupabaseGuestRepository } = await import("@/infrastructure/supabase/supabase-guest-repository");

    const reservationRepo = new SupabaseReservationRepository(supabase);
    const caravanRepo = new SupabaseCaravanRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);
    const guestRepo = new SupabaseGuestRepository(supabase);

    const updatedReservation = await confirmGuestTransfer(
      {
        transferConfirmationId,
        confirmedBy: user.id,
      },
      {
        reservationRepository: reservationRepo,
        caravanRepository: caravanRepo,
        profileRepository: profileRepo,
        guestRepository: guestRepo,
      }
    );

    revalidatePath(`/${estacaSlug}/estaca/convidados`);
    revalidatePath(`/${estacaSlug}/estaca/validacao-semanal`);
    revalidatePath(`/${estacaSlug}/estaca/calendario`);

    const statusMsg =
      updatedReservation.status === "confirmado"
        ? "Repasse confirmado com sucesso! Reserva confirmada no ônibus."
        : "Repasse confirmado! Devido à capacidade e prioridade constitucional de membros da anfitriã, a reserva foi posicionada na lista de espera.";

    return {
      success: true,
      message: statusMsg,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao confirmar repasse de convidado.";
    return { success: false, error: message };
  }
}







