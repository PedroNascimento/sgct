/**
 * Use-case: createGuestReservation (Spec 013 / T013.4)
 *
 * Criação da reserva do convidado inter-Estaca + registro atômico de transferência.
 *
 * Regras:
 * - Apenas perfis com role = 'guest' podem criar reservas inter-Estaca (US-013.1).
 * - funding_source = 'convidado_transferencia_interestaca' e status = 'aguardando_transferencia_interestaca'.
 * - Cria registro em guest_transfer_confirmations com origin_stake_name, origin_ward_name e amount.
 */

import { z } from "zod";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { GuestRepository } from "@/domain/interfaces/guest-repository";
import type { Reservation, ReservationCategory, ParticipantType } from "@/domain/types/reservation";
import type { GuestTransferConfirmation } from "@/domain/types/guest";

export const CreateGuestReservationSchema = z.object({
  userId: z.string().uuid("ID do usuário inválido"),
  caravanId: z.string().uuid("ID da caravana inválido"),
  seatNumber: z.number().int().positive("Número de assento inválido"),
  originStakeName: z.string().trim().min(1, "Nome da Estaca de origem é obrigatório"),
  originWardName: z.string().trim().min(1, "Nome da Ala de origem é obrigatório"),
  category: z.enum(["standard", "officiant"]).optional().default("standard"),
  participantType: z
    .enum(["adulto", "jovem", "crianca", "oficiante", "investidura", "selamento", "missionario_servico"])
    .optional()
    .default("adulto"),
  boardingPointId: z.string().uuid().nullable().optional(),
});

export type CreateGuestReservationInput = z.infer<typeof CreateGuestReservationSchema>;

export interface CreateGuestReservationDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
  profileRepository: ProfileRepository;
  guestRepository: GuestRepository;
}

export interface CreateGuestReservationResult {
  reservation: Reservation;
  transferConfirmation: GuestTransferConfirmation;
}

export async function createGuestReservation(
  input: CreateGuestReservationInput,
  deps: CreateGuestReservationDependencies
): Promise<CreateGuestReservationResult> {
  const validated = CreateGuestReservationSchema.parse(input);

  // 1. Validar perfil do usuário
  const profile = await deps.profileRepository.findById(validated.userId);
  if (!profile || !profile.is_active) {
    throw new Error("Perfil de convidado não encontrado ou inativo.");
  }

  if (profile.role !== "guest") {
    throw new Error("Apenas usuários com papel de convidado podem criar reservas inter-Estaca.");
  }

  // 2. Validar Caravana
  const caravan = await deps.caravanRepository.findById(validated.caravanId);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  if (caravan.status !== "open") {
    throw new Error("Inscrições para esta caravana não estão abertas.");
  }

  const paymentAmount =
    validated.category === "officiant" ? caravan.price_officiant : caravan.price_standard;

  // 3. Criar reserva com status e funding_source específicos de convidado
  const reservation = await deps.reservationRepository.create({
    caravan_id: caravan.id,
    user_id: profile.id,
    seat_number: validated.seatNumber,
    boarding_point_id: validated.boardingPointId ?? null,
    category: validated.category as ReservationCategory,
    participant_type: validated.participantType as ParticipantType,
    funding_source: "convidado_transferencia_interestaca",
    is_preferential_seating: false,
    status: "aguardando_transferencia_interestaca",
    payment_amount: paymentAmount,
  });

  // 4. Criar registro de confirmação de transferência inter-Estaca
  const transferConfirmation = await deps.guestRepository.createTransferConfirmation({
    reservation_id: reservation.id,
    stake_id: caravan.stake_id,
    origin_stake_name: validated.originStakeName,
    origin_ward_name: validated.originWardName,
    amount: paymentAmount,
  });

  return {
    reservation,
    transferConfirmation,
  };
}
