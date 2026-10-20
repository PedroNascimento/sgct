/**
 * Interface do repositório de Permuta de Assentos (seat_swap_requests).
 * Artigo I: desacopla use-cases de infraestrutura e banco de dados.
 */

import type { SeatSwapRequest, SeatSwapStatus } from "@/domain/types/swap";

export interface CreateSeatSwapData {
  stake_id?: string;
  ward_id?: string;
  original_reservation_id: string;
  new_holder_full_name: string;
  new_holder_document?: string | null;
  requested_by: string;
  status?: SeatSwapStatus;
}

export interface SwapRepository {
  create(data: CreateSeatSwapData): Promise<SeatSwapRequest>;
  findById(id: string): Promise<SeatSwapRequest | null>;
  findByReservationId(reservationId: string): Promise<SeatSwapRequest[]>;
  countApprovedByCaravanAndDate(caravanId: string, date: string): Promise<number>;
  updateStatus(id: string, status: SeatSwapStatus): Promise<SeatSwapRequest>;
}
