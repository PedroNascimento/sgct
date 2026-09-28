/**
 * Use-case: Consultar Ocupação de Assentos da Caravana (Spec 003 / US-003.4).
 *
 * Regras:
 * - Retorna apenas `seat_number` e `occupancy_status` ("livre" | "ocupado" | "reservado").
 * - NUNCA retorna nome, Ala, CPF ou dados financeiros de outros passageiros (Artigo V da Constituição - Zero PII).
 * - Sempre escopado estritamente pela `stake_id` da caravana/usuário (Artigo II da Constituição - Multi-tenant).
 */

import { z } from "zod";
import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { SeatOccupancy } from "@/domain/types/reservation";

const getSeatOccupancyInputSchema = z.object({
  caravanId: z.string().uuid("ID da caravana inválido."),
  stakeId: z.string().uuid("ID da estaca inválido."),
});

export interface GetSeatOccupancyInput {
  caravanId: string;
  stakeId: string;
}

export interface GetSeatOccupancyDependencies {
  reservationRepository: ReservationRepository;
}

export async function getSeatOccupancy(
  input: GetSeatOccupancyInput,
  deps: GetSeatOccupancyDependencies
): Promise<SeatOccupancy[]> {
  const { caravanId, stakeId } = getSeatOccupancyInputSchema.parse(input);
  const rawList = await deps.reservationRepository.getSeatOccupancy(caravanId, stakeId);

  // Sanitização rigorosa: apenas propriedades da view de ocupação (sem PII)
  return rawList.map((item) => ({
    stake_id: item.stake_id,
    caravan_id: item.caravan_id,
    seat_number: item.seat_number,
    occupancy_status: item.occupancy_status,
  }));
}
