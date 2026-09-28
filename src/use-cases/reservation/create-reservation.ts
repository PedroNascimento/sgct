/**
 * Use-case: createReservation (T003.2, T003.3, T003.4)
 *
 * Criação de Reserva de Assento por um membro autenticado (US-003.1 a US-003.6).
 *
 * Regras não-negociáveis:
 * - Validação rigorosa com Zod de todos os campos de entrada (Artigo V).
 * - Perfil do usuário deve estar ativo e completo (com CPF/documento - US-003.5).
 * - Categoria "Oficiante" aplica price_officiant sem aprovação administrativa (D12 / T003.3).
 * - Crianças de colo (0-5 anos) não podem reservar assento físico (D06 / US-003.6).
 * - Trava de concorrência por assento: erro de unicidade (23505) traduzido de forma limpa (T003.2).
 * - stake_id e ward_id são derivados pelo trigger no banco ou pelas entidades pai (Artigo II.c / T003.4).
 * - funding_source diferente de 'membro' gera status 'aguardando_auxilio' (US-003.6 / D27).
 * - Perfil convidado (role = 'guest') gera status 'aguardando_transferencia_interestaca' (D28).
 */

import {
  createReservationSchema,
  type CreateReservationInput,
} from "@/domain/schemas/reservation";
import type { Reservation, ReservationStatus } from "@/domain/types/reservation";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";

export interface CreateReservationDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
  profileRepository: ProfileRepository;
}

export async function createReservation(
  input: CreateReservationInput,
  actingUserId: string,
  deps: CreateReservationDependencies
): Promise<Reservation> {
  // 1. Validação Zod (Artigo V)
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Dados inválidos para reserva.");
  }

  const {
    caravanId,
    seatNumber,
    boardingPointId,
    category,
    participantType,
    fundingSource,
    isPreferentialSeating,
    familyGroupMemberNames,
    familyGroupLabel,
    companionForEndowmentName,
  } = parsed.data;

  // 2. Verificar usuário autenticado e perfil completo (US-003.5)
  const actingUser = await deps.profileRepository.findById(actingUserId);
  if (!actingUser || !actingUser.is_active) {
    throw new Error("Usuário não encontrado ou inativo.");
  }

  if (!actingUser.cpf) {
    throw new Error(
      "Seu perfil está incompleto. Por favor, informe seu documento antes de reservar."
    );
  }

  // 3. Crianças de colo nunca ocupam assento individual (D06 / US-003.6)
  if (participantType === "crianca") {
    throw new Error(
      "Crianças de colo de 0 a 5 anos não ocupam assento. Cadastre-a no manifesto de passageiros da sua reserva."
    );
  }

  // 4. Verificar a Caravana
  const caravan = await deps.caravanRepository.findById(caravanId);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  if (caravan.status !== "open") {
    throw new Error("Inscrições para esta caravana não estão abertas.");
  }

  // Isolamento de Estaca (Artigo II) — se não for guest, deve pertencer à mesma Estaca
  if (actingUser.role !== "guest" && actingUser.stake_id !== caravan.stake_id) {
    throw new Error("Esta caravana pertence a outra Estaca.");
  }

  // 5. Calcular valor (D12, D30)
  const paymentAmount =
    category === "officiant" ? caravan.price_officiant : caravan.price_standard;

  // 6. Calcular status inicial da reserva (US-003.6 / D27 / D28)
  let initialStatus: ReservationStatus = "pendente";
  if (actingUser.role === "guest") {
    initialStatus = "aguardando_transferencia_interestaca";
  } else if (fundingSource !== "membro") {
    initialStatus = "aguardando_auxilio";
  }

  // 7. Criar a reserva via repositório tratando concorrência de assento
  try {
    return await deps.reservationRepository.create({
      caravan_id: caravan.id,
      user_id: actingUser.id,
      seat_number: seatNumber,
      boarding_point_id: boardingPointId ?? null,
      category,
      participant_type: participantType,
      funding_source: fundingSource,
      is_preferential_seating: isPreferentialSeating,
      family_group_member_names: familyGroupMemberNames ?? null,
      family_group_label: familyGroupLabel ?? null,
      companion_for_endowment_name: companionForEndowmentName ?? null,
      status: initialStatus,
      payment_amount: paymentAmount,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string })?.code;

    // Código 23505 = unique_violation no Postgres
    if (
      errorCode === "23505" ||
      errorMsg.includes("unique") ||
      errorMsg.includes("reservations_caravan_id_seat_number_key")
    ) {
      throw new Error("Assento já ocupado. Por favor, escolha outro assento.");
    }

    throw err;
  }
}
