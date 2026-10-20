/**
 * Use-case: Aprovar Permuta de Assento (Spec 005 / US-005.2 / T005.3 e T005.4).
 *
 * Regras:
 * - Apenas Líder da Caravana ou Admin da Estaca podem aprovar (D13/D16).
 * - Transfere a titularidade do assento ao novo titular informado.
 * - NUNCA gera crédito no credit_ledger (US-005.2).
 * - No dia do embarque, limite máximo de 6 permutas por caravana; a 7ª é rejeitada (T005.4).
 * - Isolamento multi-tenant: apenas da mesma Estaca (Artigo II).
 */

import { approveSeatSwapSchema, type ApproveSeatSwapInput } from "@/domain/schemas/swap";
import type { SwapRepository } from "@/domain/interfaces/swap-repository";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { CreditRepository } from "@/domain/interfaces/credit-repository";
import type { Reservation } from "@/domain/types/reservation";
import type { SeatSwapRequest } from "@/domain/types/swap";

export interface ApproveSeatSwapDependencies {
  swapRepository: SwapRepository;
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
  profileRepository: ProfileRepository;
  creditRepository?: CreditRepository;
}

export interface ApproveSeatSwapResult {
  swapRequest: SeatSwapRequest;
  reservation: Reservation;
}

export async function approveSeatSwap(
  input: ApproveSeatSwapInput,
  deps: ApproveSeatSwapDependencies
): Promise<ApproveSeatSwapResult> {
  const { swapRepository, reservationRepository, caravanRepository, profileRepository } = deps;

  // 1. Validação Zod (Artigo V)
  const validated = approveSeatSwapSchema.parse(input);

  // 2. Busca do pedido de permuta
  const swapRequest = await swapRepository.findById(validated.swapRequestId);
  if (!swapRequest) {
    throw new Error("Solicitação de permuta não encontrada.");
  }

  if (swapRequest.status !== "pending") {
    throw new Error(`Esta solicitação de permuta já está '${swapRequest.status}'.`);
  }

  // 3. Busca da reserva e da caravana
  const reservation = await reservationRepository.findById(swapRequest.original_reservation_id);
  if (!reservation) {
    throw new Error("Reserva original não encontrada.");
  }

  const caravan = await caravanRepository.findById(reservation.caravan_id);
  if (!caravan) {
    throw new Error("Caravana não encontrada.");
  }

  // 4. Busca do aprovador e verificação de autoridade (D13/D16)
  const approver = await profileRepository.findById(validated.approverId);
  if (!approver || !approver.is_active) {
    throw new Error("Aprovador não encontrado ou inativo.");
  }

  if (approver.stake_id !== reservation.stake_id) {
    throw new Error("Não autorizado: reserva pertence a outra Estaca.");
  }

  const isCaravanLeader = caravan.caravan_leader_id === approver.id;
  const isAdminEstaca = approver.role === "admin_estaca";

  if (!isCaravanLeader && !isAdminEstaca) {
    throw new Error("Apenas o Líder da Caravana ou Admin da Estaca podem aprovar permutas.");
  }

  // 5. Verificação de limite no dia do embarque (T005.4 / US-005.2)
  const now = validated.currentDate ? new Date(validated.currentDate) : new Date();
  const currentDateStr = now.toISOString().split("T")[0];
  const departureDateStr = new Date(caravan.departure_date).toISOString().split("T")[0];

  const isBoardingDay = currentDateStr === departureDateStr;

  if (isBoardingDay) {
    const approvedTodayCount = await swapRepository.countApprovedByCaravanAndDate(
      caravan.id,
      currentDateStr
    );

    if (approvedTodayCount >= 6) {
      throw new Error("Limite de 6 permutas no dia do embarque atingido para esta caravana.");
    }
  }

  // 6. Atualização do status do pedido de permuta
  const updatedSwap = await swapRepository.updateStatus(swapRequest.id, "approved");

  // 7. Atualização da titularidade no manifesto de passageiros
  await reservationRepository.addManifestEntry({
    reservation_id: reservation.id,
    full_name: swapRequest.new_holder_full_name,
    birth_date: "1900-01-01", // Placeholder até atualização completa de cadastro do novo passageiro
    filiation: "Permuta de Assento",
  });

  return {
    swapRequest: updatedSwap,
    reservation,
  };
}
