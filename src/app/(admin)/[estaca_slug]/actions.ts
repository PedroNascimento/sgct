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
export async function searchMemberForWardAdminPromotion(
  email: string,
  stakeId: string
): Promise<{ id: string; full_name: string; role: string; ward_id: string | null; ward_name: string | null } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

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

    const userId = formData.get("userId") as string;
    const wardId = formData.get("wardId") as string;

    if (!userId || !wardId) {
      throw new Error("Selecione um membro válido e uma Ala de destino.");
    }

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
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao promover membro a Admin de Ala.",
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

    const caravanId = formData.get("caravanId") as string;
    const departureDate = formData.get("departureDate") as string;
    const returnDate = (formData.get("returnDate") as string) || null;
    const priceStandard = Number(formData.get("priceStandard"));
    const priceOfficiant = Number(formData.get("priceOfficiant"));
    const seatLimit = Number(formData.get("seatLimit") || 50);
    const waitlistLimit = Number(formData.get("waitlistLimit") || 5);
    const registrationDeadline = formData.get("registrationDeadline") as string;
    const minQuorum = Number(formData.get("minQuorum") || 48);
    const quorumCheckDate = formData.get("quorumCheckDate") as string;
    const status = formData.get("status") as string;

    // Verificar se a caravana pertence à mesma Estaca
    const { data: existingCaravan } = await supabase
      .from("caravans")
      .select("id, stake_id")
      .eq("id", caravanId)
      .single();

    if (!existingCaravan || existingCaravan.stake_id !== userStakeId) {
      throw new Error("Caravana não encontrada ou não pertence à sua Estaca.");
    }

    const { error: updateError } = await supabase
      .from("caravans")
      .update({
        departure_date: departureDate,
        return_date: returnDate,
        price_standard: priceStandard,
        price_officiant: priceOfficiant,
        seat_limit: seatLimit,
        waitlist_limit: waitlistLimit,
        registration_deadline: registrationDeadline,
        min_quorum: minQuorum,
        quorum_check_date: quorumCheckDate,
        status,
      })
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

    const name = (formData.get("name") as string) || "";

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

    const wardId = formData.get("wardId") as string;
    const name = (formData.get("name") as string) || "";

    const wardRepository = new SupabaseWardRepository(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);

    const updated = await updateWard(
      { wardId, name },
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




