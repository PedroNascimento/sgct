/**
 * Use-case: confirmGuestTransfer (Spec 013 / T013.5 / T013.7)
 *
 * Confirmação de repasse financeiro de convidado inter-Estaca.
 *
 * Regras:
 * - Apenas Admin da Estaca anfitriã (role = 'admin_estaca') pode confirmar (Artigo II.d / US-013.2).
 * - Admin Ala NUNCA tem permissão de confirmar repasses de convidados.
 * - Registra confirmação em guest_transfer_confirmations (confirmed_by, confirmed_at).
 * - Executa recálculo de ranking da caravana integrando a reserva com o confirmed_at atual.
 * - Aplica a regra de prioridade constitucional (D28 / US-013.3 / T013.7): membros da Estaca anfitriã
 *   (mesmo em lista de espera) possuem prioridade irrestrita sobre o convidado.
 */

import { z } from "zod";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CaravanRepository } from "@/domain/interfaces/caravan-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import type { GuestRepository } from "@/domain/interfaces/guest-repository";
import type { Reservation } from "@/domain/types/reservation";
import { recalculateCaravanRanking } from "@/use-cases/payment/recalculate-caravan-ranking";

export const ConfirmGuestTransferSchema = z.object({
  transferConfirmationId: z.string().uuid("ID de confirmação de transferência inválido"),
  confirmedBy: z.string().uuid("ID do administrador responsável inválido"),
});

export type ConfirmGuestTransferInput = z.infer<typeof ConfirmGuestTransferSchema>;

export interface ConfirmGuestTransferDependencies {
  reservationRepository: ReservationRepository;
  caravanRepository: CaravanRepository;
  profileRepository: ProfileRepository;
  guestRepository: GuestRepository;
  recalculateCaravanRanking?: (
    caravanId: string,
    deps: any,
    confirmedAtIso: string
  ) => Promise<{ confirmed: Reservation[]; waitlisted: Reservation[] }>;
}

export async function confirmGuestTransfer(
  input: ConfirmGuestTransferInput,
  deps: ConfirmGuestTransferDependencies
): Promise<Reservation> {
  const validated = ConfirmGuestTransferSchema.parse(input);

  // 1. Validar administrador que está confirmando
  const admin = await deps.profileRepository.findById(validated.confirmedBy);
  if (!admin || !admin.is_active) {
    throw new Error("Administrador não encontrado ou inativo.");
  }

  if (admin.role !== "admin_estaca") {
    throw new Error("Apenas o Administrador da Estaca anfitriã pode confirmar repasses de convidados.");
  }

  // 2. Buscar o registro de transferência
  const transfer = await deps.guestRepository.findTransferConfirmationById(validated.transferConfirmationId);
  if (!transfer) {
    throw new Error("Confirmação de transferência inter-Estaca não encontrada.");
  }

  // Isolamento de Estaca (Artigo II)
  if (admin.stake_id !== transfer.stake_id) {
    throw new Error("Não autorizado: este repasse pertence a outra Estaca.");
  }

  if (transfer.confirmed_at) {
    throw new Error("Este repasse de convidado já foi confirmado anteriormente.");
  }

  // 3. Buscar a reserva correspondente
  const reservation = await deps.reservationRepository.findById(transfer.reservation_id);
  if (!reservation) {
    throw new Error("Reserva vinculada ao repasse não encontrada.");
  }

  const nowIso = new Date().toISOString();

  // 4. Marcar transferência como confirmada
  await deps.guestRepository.confirmTransfer(transfer.id, admin.id);

  // 5. Atualizar status temporário da reserva para entrar no pool de recálculo
  await deps.reservationRepository.updateStatus(reservation.id, {
    status: "confirmado",
    confirmed_at: nowIso,
  });

  // 6. Recalcular ranking aplicando estritamente as regras de capacidade e prioridade
  //    (recalculateCaravanRanking garante que convidados fiquem sempre depois de membros da anfitriã)
  const rankingResult = deps.recalculateCaravanRanking
    ? await deps.recalculateCaravanRanking(reservation.caravan_id, deps, nowIso)
    : await recalculateCaravanRanking(
        reservation.caravan_id,
        {
          reservationRepository: deps.reservationRepository,
          caravanRepository: deps.caravanRepository,
        },
        nowIso
      );

  const updatedInConfirmed = rankingResult.confirmed.find((r: Reservation) => r.id === reservation.id);
  if (updatedInConfirmed) {
    return updatedInConfirmed;
  }

  const updatedInWaitlist = rankingResult.waitlisted.find((r: Reservation) => r.id === reservation.id);
  if (updatedInWaitlist) {
    return updatedInWaitlist;
  }

  const reloaded = await deps.reservationRepository.findById(reservation.id);
  return reloaded || reservation;
}
