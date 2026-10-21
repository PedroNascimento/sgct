/**
 * Interface do repositório para Convidado Inter-Estaca (Spec 013).
 * Artigo I: desacopla use-cases de banco de dados.
 */

import type { GuestTransferConfirmation, CreateGuestTransferData } from "@/domain/types/guest";
import type { Reservation } from "@/domain/types/reservation";
import type { Profile } from "@/domain/types/tenant";

export interface PendingGuestTransferItem extends GuestTransferConfirmation {
  reservation?: Reservation;
  profile?: Profile;
}

export interface GuestRepository {
  createTransferConfirmation(data: CreateGuestTransferData): Promise<GuestTransferConfirmation>;
  findTransferConfirmationById(id: string): Promise<GuestTransferConfirmation | null>;
  findTransferConfirmationByReservationId(reservationId: string): Promise<GuestTransferConfirmation | null>;
  findPendingTransfersByStake(stakeId: string): Promise<PendingGuestTransferItem[]>;
  confirmTransfer(id: string, confirmedBy: string): Promise<GuestTransferConfirmation>;
}
