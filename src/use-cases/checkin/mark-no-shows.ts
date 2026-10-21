/**
 * Caso de uso: Marcar No-Show pós-embarque (Spec 007 / T007.7 / US-007.3).
 *
 * Quando o embarque de uma caravana se encerra, reservas com status 'confirmado'
 * que não tiveram check-in registrado para a direção 'ida' são marcadas como 'no_show',
 * SEM geração automática de crédito (D03).
 */

import type { ReservationRepository } from "@/domain/interfaces/reservation-repository";
import type { CheckInRepository } from "@/domain/interfaces/checkin-repository";

export interface MarkNoShowsInput {
  caravanId: string;
}

export interface MarkNoShowsOutput {
  markedCount: number;
  markedReservationIds: string[];
}

export class MarkNoShows {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly checkInRepository: CheckInRepository
  ) {}

  async execute(input: MarkNoShowsInput): Promise<MarkNoShowsOutput> {
    const { caravanId } = input;

    // 1. Buscar todas as reservas confirmadas da caravana
    const confirmedReservations =
      await this.reservationRepository.findByCaravanAndStatuses(caravanId, [
        "confirmado",
      ]);

    if (confirmedReservations.length === 0) {
      return { markedCount: 0, markedReservationIds: [] };
    }

    // 2. Buscar todos os check-ins da caravana para identificar quem embarcou na 'ida'
    const caravanCheckIns = await this.checkInRepository.listByCaravan(caravanId);
    const checkedInReservationIds = new Set(
      caravanCheckIns
        .filter((chk) => chk.direction === "ida")
        .map((chk) => chk.reservation_id)
    );

    // 3. Filtrar reservas sem check-in de ida
    const noShowReservations = confirmedReservations.filter(
      (res) => !checkedInReservationIds.has(res.id)
    );

    const markedReservationIds: string[] = [];

    // 4. Atualizar status para 'no_show' sem gerar crédito automático (D03)
    for (const res of noShowReservations) {
      await this.reservationRepository.updateStatus(res.id, {
        status: "no_show",
      });
      markedReservationIds.push(res.id);
    }

    return {
      markedCount: markedReservationIds.length,
      markedReservationIds,
    };
  }
}
