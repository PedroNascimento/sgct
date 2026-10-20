/**
 * Use-case: Solicitar Permuta de Assento (Spec 005 / US-005.2 / T005.3).
 *
 * Regras:
 * - Titular da reserva ou Admin (Ala/Estaca) cria a solicitação informando o novo titular.
 * - Reserva precisa estar em status 'confirmado'.
 * - Solicitação é criada com status 'pending'.
 */

import { requestSeatSwapSchema, type RequestSeatSwapInput } from "@/domain/schemas/swap";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { SwapRepository } from "@/domain/interfaces/swap-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { SeatSwapRequest } from "@/domain/types/swap";

export interface RequestSeatSwapDependencies {
  reservationRepository: ReservationRepository;
  swapRepository: SwapRepository;
  profileRepository: ProfileRepository;
}

export async function requestSeatSwap(
  input: RequestSeatSwapInput,
  deps: RequestSeatSwapDependencies
): Promise<SeatSwapRequest> {
  const { reservationRepository, swapRepository, profileRepository } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = requestSeatSwapSchema.parse(input);

  // 2. Busca do solicitante
  const user = await profileRepository.findById(validated.requestedBy);
  if (!user || !user.is_active) {
    throw new Error("Solicitante não encontrado ou inativo.");
  }

  // 3. Busca da reserva
  const reservation = await reservationRepository.findById(validated.reservationId);
  if (!reservation) {
    throw new Error("Reserva não encontrada.");
  }

  // 4. Verificação de permissão (dono da reserva ou admin da mesma estaca)
  const isOwner = reservation.user_id === user.id;
  const isAdmin =
    (user.role === "admin_estaca" || user.role === "admin_ala") &&
    user.stake_id === reservation.stake_id;

  if (!isOwner && !isAdmin) {
    throw new Error("Você não tem permissão para solicitar permuta desta reserva.");
  }

  // 5. Validação de status da reserva
  if (reservation.status !== "confirmado") {
    throw new Error("Apenas reservas com status 'confirmado' podem ter permuta solicitada.");
  }

  // 6. Criação do pedido de permuta
  const swapRequest = await swapRepository.create({
    original_reservation_id: reservation.id,
    new_holder_full_name: validated.newHolderFullName,
    new_holder_document: validated.newHolderDocument,
    requested_by: user.id,
    status: "pending",
  });

  return swapRequest;
}
